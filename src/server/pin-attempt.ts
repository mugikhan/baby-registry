import { eq, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "@/db/schema";
import { rateLimits } from "@/db/schema";
import type { ClientKey, Pin, SessionSecret, TurnstileToken } from "./brands";
import { hmac, timingSafeEqual } from "./crypto";
import type { TurnstileVerifier } from "./turnstile";

export const CLIENT_LIMIT = 5;
export const CLIENT_WINDOW_MS = 15 * 60 * 1000;
export const GLOBAL_LIMIT = 30;
export const GLOBAL_WINDOW_MS = 60 * 60 * 1000;

const GLOBAL_KEY = "global:pin:all";

export type PinAttemptResult =
  | { kind: "ok" }
  | { kind: "wrong" }
  | { kind: "locked"; until: number }
  | { kind: "paused"; until: number }
  | { kind: "turnstile_failed" };

export type PinAttemptDeps = {
  db: DrizzleD1Database<typeof schema>;
  familyPin: Pin;
  secret: SessionSecret;
  verifyTurnstile: TurnstileVerifier;
};

export type PinAttemptInput = {
  pin: Pin;
  turnstileToken: TurnstileToken;
  clientKey: ClientKey;
  now: number;
};

async function windowEnd({
  db,
  key,
  limit,
  windowMs,
  now,
}: {
  db: PinAttemptDeps["db"];
  key: string;
  limit: number;
  windowMs: number;
  now: number;
}): Promise<number | null> {
  const row = await db.query.rateLimits.findFirst({ where: eq(rateLimits.key, key) });
  if (!row || row.count < limit) return null;
  const end = row.windowStart + windowMs;
  return now < end ? end : null;
}

function countFailure({
  db,
  key,
  windowMs,
  now,
}: {
  db: PinAttemptDeps["db"];
  key: string;
  windowMs: number;
  now: number;
}) {
  const expired = sql`${rateLimits.windowStart} + ${windowMs} <= ${now}`;
  return db
    .insert(rateLimits)
    .values({ key, windowStart: now, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        windowStart: sql`CASE WHEN ${expired} THEN ${now} ELSE ${rateLimits.windowStart} END`,
        count: sql`CASE WHEN ${expired} THEN 1 ELSE ${rateLimits.count} + 1 END`,
      },
    });
}

export async function attemptPin(
  deps: PinAttemptDeps,
  { pin, turnstileToken, clientKey, now }: PinAttemptInput,
): Promise<PinAttemptResult> {
  const { db } = deps;
  const clientRateKey = `client:pin:${clientKey}`;

  const pausedUntil = await windowEnd({
    db,
    key: GLOBAL_KEY,
    limit: GLOBAL_LIMIT,
    windowMs: GLOBAL_WINDOW_MS,
    now,
  });
  if (pausedUntil !== null) return { kind: "paused", until: pausedUntil };

  const lockedUntil = await windowEnd({
    db,
    key: clientRateKey,
    limit: CLIENT_LIMIT,
    windowMs: CLIENT_WINDOW_MS,
    now,
  });
  if (lockedUntil !== null) return { kind: "locked", until: lockedUntil };

  if (!(await deps.verifyTurnstile({ token: turnstileToken, clientKey }))) {
    return { kind: "turnstile_failed" };
  }

  const [submitted, expected] = await Promise.all([
    hmac({ secret: deps.secret, message: pin }),
    hmac({ secret: deps.secret, message: deps.familyPin }),
  ]);
  if (timingSafeEqual(submitted, expected)) return { kind: "ok" };

  await db.batch([
    countFailure({ db, key: clientRateKey, windowMs: CLIENT_WINDOW_MS, now }),
    countFailure({ db, key: GLOBAL_KEY, windowMs: GLOBAL_WINDOW_MS, now }),
  ]);
  return { kind: "wrong" };
}
