import { hmac, timingSafeEqual, toHex } from "./crypto";

export const SESSION_COOKIE = "registry_session";
export const SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

export async function issueSession(
  secret: string,
  pinVersion: number,
  nowMs: number,
): Promise<string> {
  const payload = `${Math.floor(nowMs / 1000)}.${pinVersion}`;
  return `${payload}.${toHex(await hmac(secret, payload))}`;
}

export async function verifySession(
  value: string | undefined,
  secret: string,
  pinVersion: number,
  nowMs: number,
): Promise<boolean> {
  const parts = value?.split(".");
  if (parts?.length !== 3) return false;
  const [issuedAt, version, signature] = parts as [string, string, string];
  const expected = toHex(await hmac(secret, `${issuedAt}.${version}`));
  const encoder = new TextEncoder();
  if (!timingSafeEqual(encoder.encode(signature), encoder.encode(expected))) return false;
  const ageSeconds = nowMs / 1000 - Number(issuedAt);
  return ageSeconds >= 0 && ageSeconds < SESSION_MAX_AGE_SECONDS && Number(version) === pinVersion;
}

export function readCookie(header: string | null, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}
