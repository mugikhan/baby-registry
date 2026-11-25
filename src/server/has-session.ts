import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { getServerConfig } from "./config";
import { SESSION_COOKIE, readCookie, verifySession } from "./session";

export async function hasValidSession(request: Request): Promise<boolean> {
  const cookie = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  if (!cookie) return false;
  const row = await getDb().query.settings.findFirst({ where: eq(settings.id, 1) });
  return verifySession({
    value: cookie,
    secret: getServerConfig().sessionSecret,
    pinVersion: row?.pinVersion ?? 1,
    nowMs: Date.now(),
  });
}
