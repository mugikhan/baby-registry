import { describe, expect, it } from "vitest";
import {
  verifyAccessToken,
  type AccessConfig,
  type JwksFetcher,
} from "@/server/admin/access-token";

const NOW_MS = 1_800_000_000_000;
const NOW_S = NOW_MS / 1000;
const ISSUER = "https://unit.cloudflareaccess.com";
const AUD = "unit-aud";
const EMAIL = "organiser@example.com";

interface TestKey {
  kid: string;
  privateKey: CryptoKey;
  publicJwk: JsonWebKey & { kid: string };
}

async function makeKey(kid: string): Promise<TestKey> {
  const pair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  return { kid, privateKey: pair.privateKey, publicJwk: { ...jwk, kid } };
}

function b64url(bytes: Uint8Array | string): string {
  const raw = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  return btoa(String.fromCharCode(...raw))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sign(
  key: TestKey,
  claims: Record<string, unknown> = {},
  header: Record<string, unknown> = {},
): Promise<string> {
  const head = b64url(JSON.stringify({ alg: "RS256", kid: key.kid, ...header }));
  const body = b64url(
    JSON.stringify({
      iss: ISSUER,
      aud: [AUD],
      email: EMAIL,
      exp: NOW_S + 3600,
      iat: NOW_S,
      ...claims,
    }),
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key.privateKey,
    new TextEncoder().encode(`${head}.${body}`),
  );
  return `${head}.${body}.${b64url(new Uint8Array(signature))}`;
}

function inlineConfig(key: TestKey): AccessConfig {
  return {
    issuer: ISSUER,
    audience: AUD,
    organiserEmails: new Set([EMAIL]),
    jwks: {
      keys: [{ kty: "RSA", kid: key.kid, n: key.publicJwk.n ?? "", e: key.publicJwk.e ?? "" }],
    },
  };
}

function remoteConfig(issuer: string): AccessConfig {
  return { issuer, audience: AUD, organiserEmails: new Set([EMAIL]) };
}

function jwksBody(...keys: TestKey[]) {
  return { keys: keys.map((key) => ({ kty: "RSA", ...key.publicJwk })) };
}

describe("verifyAccessToken", () => {
  it("accepts a valid token and returns the lower-cased email", async () => {
    const key = await makeKey("k1");
    const token = await sign(key, { email: "Organiser@Example.com", aud: AUD });
    expect(await verifyAccessToken(token, inlineConfig(key), NOW_MS)).toEqual({
      kind: "verified",
      email: EMAIL,
    });
  });

  it("refuses a signature from another key", async () => {
    const key = await makeKey("k1");
    const other = await makeKey("k1");
    const token = await sign(other);
    expect(await verifyAccessToken(token, inlineConfig(key), NOW_MS)).toEqual({
      kind: "refused",
      reason: "bad-signature",
    });
  });

  it("refuses the wrong issuer", async () => {
    const key = await makeKey("k1");
    const token = await sign(key, { iss: "https://other.cloudflareaccess.com" });
    expect(await verifyAccessToken(token, inlineConfig(key), NOW_MS)).toMatchObject({
      reason: "wrong-issuer",
    });
  });

  it("refuses the wrong audience", async () => {
    const key = await makeKey("k1");
    const token = await sign(key, { aud: ["another-aud"] });
    expect(await verifyAccessToken(token, inlineConfig(key), NOW_MS)).toMatchObject({
      reason: "wrong-audience",
    });
  });

  it("refuses an expired token and allows 60 seconds of skew", async () => {
    const key = await makeKey("k1");
    const expired = await sign(key, { exp: NOW_S - 120 });
    const skewed = await sign(key, { exp: NOW_S - 30 });
    expect(await verifyAccessToken(expired, inlineConfig(key), NOW_MS)).toMatchObject({
      reason: "expired",
    });
    expect(await verifyAccessToken(skewed, inlineConfig(key), NOW_MS)).toMatchObject({
      kind: "verified",
    });
  });

  it("refuses a token that is not valid yet", async () => {
    const key = await makeKey("k1");
    const token = await sign(key, { nbf: NOW_S + 600 });
    expect(await verifyAccessToken(token, inlineConfig(key), NOW_MS)).toMatchObject({
      reason: "not-yet-valid",
    });
  });

  it("refuses an email off the list", async () => {
    const key = await makeKey("k1");
    const token = await sign(key, { email: "stranger@example.com" });
    expect(await verifyAccessToken(token, inlineConfig(key), NOW_MS)).toMatchObject({
      reason: "not-an-organiser",
    });
  });

  it("refuses malformed tokens", async () => {
    const key = await makeKey("k1");
    for (const token of ["", "abc", "a.b", "a.b.c.d", "!!.!!.!!"]) {
      expect(await verifyAccessToken(token, inlineConfig(key), NOW_MS)).toMatchObject({
        kind: "refused",
      });
    }
  });

  it("refuses alg none and other algorithms", async () => {
    const key = await makeKey("k1");
    const none = `${b64url(JSON.stringify({ alg: "none", kid: "k1" }))}.${b64url(
      JSON.stringify({ iss: ISSUER, aud: AUD, email: EMAIL, exp: NOW_S + 3600 }),
    )}.`;
    const hs256 = await sign(key, {}, { alg: "HS256" });
    expect(await verifyAccessToken(none, inlineConfig(key), NOW_MS)).toMatchObject({
      kind: "refused",
    });
    expect(await verifyAccessToken(hs256, inlineConfig(key), NOW_MS)).toEqual({
      kind: "refused",
      reason: "bad-header",
    });
  });

  it("refuses an unknown key id without fetching for inline keys", async () => {
    const key = await makeKey("k1");
    const token = await sign(await makeKey("missing"));
    expect(await verifyAccessToken(token, inlineConfig(key), NOW_MS)).toEqual({
      kind: "refused",
      reason: "unknown-key",
    });
  });
});

describe("verifyAccessToken key fetching", () => {
  it("fetches once, caches, and refetches once for an unknown key id", async () => {
    const issuer = "https://refetch.cloudflareaccess.com";
    const first = await makeKey("a");
    const second = await makeKey("b");
    const urls: string[] = [];
    let body = jwksBody(first);
    const fetcher: JwksFetcher = async (url) => {
      urls.push(url);
      return body;
    };
    const config = { ...remoteConfig(issuer) };
    const claims = { iss: issuer };

    expect(
      await verifyAccessToken(await sign(first, claims), config, NOW_MS, fetcher),
    ).toMatchObject({
      kind: "verified",
    });
    expect(
      await verifyAccessToken(await sign(first, claims), config, NOW_MS + 1000, fetcher),
    ).toMatchObject({
      kind: "verified",
    });
    expect(urls).toEqual([`${issuer}/cdn-cgi/access/certs`]);

    body = jwksBody(first, second);
    const later = NOW_MS + 60_000;
    expect(
      await verifyAccessToken(await sign(second, claims), config, later, fetcher),
    ).toMatchObject({
      kind: "verified",
    });
    expect(urls).toHaveLength(2);

    const unknown = await sign(await makeKey("c"), claims);
    expect(await verifyAccessToken(unknown, config, later + 60_000, fetcher)).toEqual({
      kind: "refused",
      reason: "unknown-key",
    });
    expect(urls).toHaveLength(3);
  });

  it("does not refetch inside the cooldown", async () => {
    const issuer = "https://cooldown.cloudflareaccess.com";
    const first = await makeKey("a");
    let calls = 0;
    const fetcher: JwksFetcher = async () => {
      calls += 1;
      return jwksBody(first);
    };
    const config = remoteConfig(issuer);
    const token = await sign(await makeKey("zzz"), { iss: issuer });
    await verifyAccessToken(token, config, NOW_MS, fetcher);
    await verifyAccessToken(token, config, NOW_MS + 1000, fetcher);
    expect(calls).toBe(1);
  });

  it("refuses when the key fetch fails", async () => {
    const issuer = "https://down.cloudflareaccess.com";
    const key = await makeKey("a");
    const fetcher: JwksFetcher = async () => {
      throw new Error("offline");
    };
    expect(
      await verifyAccessToken(
        await sign(key, { iss: issuer }),
        remoteConfig(issuer),
        NOW_MS,
        fetcher,
      ),
    ).toEqual({ kind: "refused", reason: "keys-unavailable" });
  });
});
