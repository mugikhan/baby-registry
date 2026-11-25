import { z } from "zod";
import type { SessionSecret } from "./brands";
import { hmac, timingSafeEqual, toHex } from "./crypto";

export const SESSION_COOKIE = "registry_session";
export const SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

const digits = z.string().transform(Number).pipe(z.number().int().nonnegative());

const SessionTokenSchema = z
  .string()
  .regex(/^\d+\.\d+\.[0-9a-f]{64}$/)
  .transform((value) => value.split("."))
  .pipe(z.tuple([digits, digits, z.string()]))
  .transform(([issuedAt, pinVersion, signature]) => ({ issuedAt, pinVersion, signature }));

export type SessionToken = z.infer<typeof SessionTokenSchema>;

export async function issueSession({
  secret,
  pinVersion,
  nowMs,
}: {
  secret: SessionSecret;
  pinVersion: number;
  nowMs: number;
}): Promise<string> {
  const payload = `${Math.floor(nowMs / 1000)}.${pinVersion}`;
  return `${payload}.${toHex(await hmac({ secret, message: payload }))}`;
}

export async function verifySession({
  value,
  secret,
  pinVersion,
  nowMs,
}: {
  value: string | undefined;
  secret: SessionSecret;
  pinVersion: number;
  nowMs: number;
}): Promise<boolean> {
  const parsed = SessionTokenSchema.safeParse(value);
  if (!parsed.success) return false;
  const token = parsed.data;
  const expected = toHex(await hmac({ secret, message: `${token.issuedAt}.${token.pinVersion}` }));
  const encoder = new TextEncoder();
  if (!timingSafeEqual(encoder.encode(token.signature), encoder.encode(expected))) return false;
  const ageSeconds = nowMs / 1000 - token.issuedAt;
  return ageSeconds >= 0 && ageSeconds < SESSION_MAX_AGE_SECONDS && token.pinVersion === pinVersion;
}

export function readCookie(header: string | null, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}
