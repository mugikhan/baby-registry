import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { getServerConfig } from "./config";
import { SESSION_COOKIE, readCookie, verifySession } from "./session";

const PIN_VERSION_TTL_MS = 60_000;

let cachedPinVersion: { value: number; fetchedAtMs: number } | undefined;

async function currentPinVersion(nowMs: number): Promise<number> {
  if (cachedPinVersion && nowMs - cachedPinVersion.fetchedAtMs < PIN_VERSION_TTL_MS) {
    return cachedPinVersion.value;
  }
  const row = await getDb().query.settings.findFirst({ where: eq(settings.id, 1) });
  const value = row?.pinVersion ?? 1;
  cachedPinVersion = { value, fetchedAtMs: nowMs };
  return value;
}

export async function hasValidSession(request: Request, nowMs = Date.now()): Promise<boolean> {
  const cookie = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  if (!cookie) return false;
  return verifySession({
    value: cookie,
    secret: getServerConfig().sessionSecret,
    pinVersion: await currentPinVersion(nowMs),
    nowMs,
  });
}
