import { z } from "zod";

const CLOCK_SKEW_SECONDS = 60;
const REFETCH_COOLDOWN_MS = 10_000;

const RsaJwkSchema = z.object({
  kty: z.literal("RSA"),
  kid: z.string().min(1),
  n: z.string().min(1),
  e: z.string().min(1),
});

export const JwksSchema = z.object({ keys: z.array(z.unknown()) }).transform(({ keys }) => ({
  keys: keys.flatMap((key) => {
    const parsed = RsaJwkSchema.safeParse(key);
    return parsed.success ? [parsed.data] : [];
  }),
}));

export type Jwks = z.infer<typeof JwksSchema>;

export interface AccessConfig {
  issuer: string;
  audience: string;
  organiserEmails: ReadonlySet<string>;
  jwks?: Jwks;
}

export type Refusal =
  | "malformed"
  | "bad-header"
  | "unknown-key"
  | "keys-unavailable"
  | "bad-signature"
  | "bad-claims"
  | "wrong-issuer"
  | "wrong-audience"
  | "expired"
  | "not-yet-valid"
  | "not-an-organiser";

export type AccessResult =
  | { kind: "verified"; email: string }
  | { kind: "refused"; reason: Refusal };

export type JwksFetcher = (url: string) => Promise<unknown>;

const HeaderSchema = z.object({ alg: z.literal("RS256"), kid: z.string().min(1) });

const ClaimsSchema = z.object({
  iss: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number(),
  nbf: z.number().optional(),
  iat: z.number().optional(),
  email: z.string(),
});

interface KeySet {
  keys: Map<string, CryptoKey>;
  fetchedAtMs: number;
}

const remoteKeySets = new Map<string, KeySet>();
const inlineKeySets = new WeakMap<Jwks, KeySet>();

const BASE64URL = /^[A-Za-z0-9_-]+$/;

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> | undefined {
  if (!BASE64URL.test(value)) return undefined;
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  try {
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  } catch {
    return undefined;
  }
}

function decodeJson(value: string): unknown {
  const bytes = decodeBase64Url(value);
  if (!bytes) return undefined;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}

async function importKeys(jwks: Jwks, nowMs: number): Promise<KeySet> {
  const entries = await Promise.all(
    jwks.keys.map(async ({ kid, n, e }) => {
      const key = await crypto.subtle.importKey(
        "jwk",
        { kty: "RSA", n, e, alg: "RS256", ext: true },
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"],
      );
      return [kid, key] as const;
    }),
  );
  return { keys: new Map(entries), fetchedAtMs: nowMs };
}

async function fetchRemoteKeySet(issuer: string, fetchJwks: JwksFetcher, nowMs: number) {
  const body = await fetchJwks(`${issuer}/cdn-cgi/access/certs`);
  return importKeys(JwksSchema.parse(body), nowMs);
}

async function defaultFetchJwks(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`The JWKS request failed with ${response.status}`);
  return response.json();
}

async function findKey({
  config,
  kid,
  nowMs,
  fetchJwks,
}: {
  config: AccessConfig;
  kid: string;
  nowMs: number;
  fetchJwks: JwksFetcher;
}): Promise<CryptoKey | "unknown-key" | "keys-unavailable"> {
  const { jwks } = config;
  if (jwks) {
    let set = inlineKeySets.get(jwks);
    if (!set) {
      set = await importKeys(jwks, nowMs);
      inlineKeySets.set(jwks, set);
    }
    return set.keys.get(kid) ?? "unknown-key";
  }

  try {
    let set = remoteKeySets.get(config.issuer);
    if (!set) {
      set = await fetchRemoteKeySet(config.issuer, fetchJwks, nowMs);
      remoteKeySets.set(config.issuer, set);
      return set.keys.get(kid) ?? "unknown-key";
    }
    const cached = set.keys.get(kid);
    if (cached) return cached;
    // A rotated key id is the only reason to refetch, and the cooldown stops request floods.
    if (nowMs - set.fetchedAtMs < REFETCH_COOLDOWN_MS) return "unknown-key";
    set = await fetchRemoteKeySet(config.issuer, fetchJwks, nowMs);
    remoteKeySets.set(config.issuer, set);
    return set.keys.get(kid) ?? "unknown-key";
  } catch {
    return "keys-unavailable";
  }
}

function refuse(reason: Refusal): AccessResult {
  return { kind: "refused", reason };
}

export async function verifyAccessToken(
  token: string,
  config: AccessConfig,
  nowMs: number,
  fetchJwks: JwksFetcher = defaultFetchJwks,
): Promise<AccessResult> {
  const parts = token.split(".");
  const [encodedHeader, encodedClaims, encodedSignature] = parts;
  if (parts.length !== 3 || !encodedHeader || !encodedClaims || !encodedSignature) {
    return refuse("malformed");
  }

  const header = HeaderSchema.safeParse(decodeJson(encodedHeader));
  if (!header.success) return refuse("bad-header");

  const signature = decodeBase64Url(encodedSignature);
  if (!signature) return refuse("malformed");

  const key = await findKey({ config, kid: header.data.kid, nowMs, fetchJwks });
  if (typeof key === "string") return refuse(key);

  const signed = new TextEncoder().encode(`${encodedHeader}.${encodedClaims}`);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signed);
  if (!valid) return refuse("bad-signature");

  const claims = ClaimsSchema.safeParse(decodeJson(encodedClaims));
  if (!claims.success) return refuse("bad-claims");

  const nowSeconds = nowMs / 1000;
  const { iss, aud, exp, nbf, iat, email } = claims.data;
  if (iss !== config.issuer) return refuse("wrong-issuer");
  if (!(Array.isArray(aud) ? aud : [aud]).includes(config.audience))
    return refuse("wrong-audience");
  if (exp + CLOCK_SKEW_SECONDS <= nowSeconds) return refuse("expired");
  if (nbf !== undefined && nbf - CLOCK_SKEW_SECONDS > nowSeconds) return refuse("not-yet-valid");
  if (iat !== undefined && iat - CLOCK_SKEW_SECONDS > nowSeconds) return refuse("not-yet-valid");

  const normalised = email.trim().toLowerCase();
  if (!config.organiserEmails.has(normalised)) return refuse("not-an-organiser");
  return { kind: "verified", email: normalised };
}
