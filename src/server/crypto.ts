import type { SessionSecret } from "./brands";

const encoder = new TextEncoder();

export async function hmac({
  secret,
  message,
}: {
  secret: SessionSecret;
  message: string;
}): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  for (const [i, byte] of a.entries()) diff |= byte ^ (b[i] ?? 0);
  return diff === 0;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
