import { createPrivateKey, createSign, generateKeyPairSync, type KeyObject } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";

const FixtureSchema = z.object({
  kty: z.literal("RSA"),
  kid: z.string(),
  n: z.string(),
  e: z.string(),
  d: z.string(),
  p: z.string(),
  q: z.string(),
  dp: z.string(),
  dq: z.string(),
  qi: z.string(),
});

const fixture = FixtureSchema.parse(
  JSON.parse(readFileSync(new URL("./fixtures/access-test-key.json", import.meta.url), "utf8")),
);

const fixtureKey = createPrivateKey({ key: fixture, format: "jwk" });

export const TEST_ISSUER = "https://test.cloudflareaccess.com";
export const TEST_AUD = "test-aud";
export const ORGANISER_EMAIL = "organiser@example.com";

interface TokenOptions {
  email?: string;
  aud?: string | string[];
  iss?: string;
  expiresInSeconds?: number;
  kid?: string;
  key?: KeyObject;
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function otherKey(): KeyObject {
  return generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
}

export function signAccessToken(options: TokenOptions = {}): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = encode({ alg: "RS256", typ: "JWT", kid: options.kid ?? fixture.kid });
  const claims = encode({
    iss: options.iss ?? TEST_ISSUER,
    aud: options.aud ?? [TEST_AUD],
    email: options.email ?? ORGANISER_EMAIL,
    iat: nowSeconds,
    exp: nowSeconds + (options.expiresInSeconds ?? 3600),
  });
  const signature = createSign("RSA-SHA256")
    .update(`${header}.${claims}`)
    .sign(options.key ?? fixtureKey)
    .toString("base64url");
  return `${header}.${claims}.${signature}`;
}

export const ACCESS_HEADER = "Cf-Access-Jwt-Assertion";
