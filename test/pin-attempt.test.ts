import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import {
  CLIENT_LIMIT,
  CLIENT_WINDOW_MS,
  GLOBAL_LIMIT,
  GLOBAL_WINDOW_MS,
  attemptPin,
  type PinAttemptResult,
} from "@/server/pin-attempt";
import { issueSession, verifySession } from "@/server/session";

const db = drizzle(env.DB, { schema });
const T0 = Date.UTC(2027, 0, 1);
const SECRET = "test-session-secret-at-least-32-bytes-long-0123456789";

let turnstilePasses = true;
let turnstileCalls = 0;

function attempt(pin: string, clientKey: string, now: number): Promise<PinAttemptResult> {
  return attemptPin(
    {
      db,
      familyPin: "2027",
      secret: SECRET,
      verifyTurnstile: async () => {
        turnstileCalls++;
        return turnstilePasses;
      },
    },
    { pin, turnstileToken: "token", clientKey, now },
  );
}

async function failTimes(count: number, clientKey: string, now: number) {
  for (let i = 0; i < count; i++) await attempt("0000", clientKey, now);
}

beforeEach(async () => {
  await db.delete(schema.rateLimits);
  turnstilePasses = true;
  turnstileCalls = 0;
});

describe("attemptPin", () => {
  it("accepts the right PIN", async () => {
    expect(await attempt("2027", "a", T0)).toEqual({ status: "ok" });
  });

  it("rejects a wrong PIN", async () => {
    expect(await attempt("1234", "a", T0)).toEqual({ status: "wrong" });
  });

  it("locks a client on the 6th wrong try and leaves other clients alone", async () => {
    await failTimes(CLIENT_LIMIT, "a", T0);
    expect(await attempt("0000", "a", T0 + 1000)).toEqual({
      status: "locked",
      until: T0 + CLIENT_WINDOW_MS,
    });
    expect(await attempt("2027", "a", T0 + 1000)).toMatchObject({ status: "locked" });
    expect(await attempt("0000", "b", T0 + 1000)).toEqual({ status: "wrong" });
  });

  it("lets a locked client try again after the window", async () => {
    await failTimes(CLIENT_LIMIT, "a", T0);
    expect(await attempt("2027", "a", T0 + CLIENT_WINDOW_MS)).toEqual({ status: "ok" });
  });

  it("does not call Turnstile for a locked client", async () => {
    await failTimes(CLIENT_LIMIT, "a", T0);
    turnstileCalls = 0;
    await attempt("0000", "a", T0 + 1000);
    expect(turnstileCalls).toBe(0);
  });

  it("pauses everyone after 30 wrong tries in an hour, even with the right PIN", async () => {
    for (let i = 0; i < GLOBAL_LIMIT; i++) await attempt("0000", `client-${i}`, T0);
    const late = T0 + 60_000;
    expect(await attempt("2027", "fresh", late)).toEqual({
      status: "paused",
      until: T0 + GLOBAL_WINDOW_MS,
    });
    expect(await attempt("0000", "fresh", late)).toMatchObject({ status: "paused" });
  });

  it("works again after the global hour", async () => {
    for (let i = 0; i < GLOBAL_LIMIT; i++) await attempt("0000", `client-${i}`, T0);
    expect(await attempt("2027", "fresh", T0 + GLOBAL_WINDOW_MS)).toEqual({ status: "ok" });
  });

  it("keeps the global count after a correct PIN", async () => {
    for (let i = 0; i < GLOBAL_LIMIT - 1; i++) await attempt("0000", `client-${i}`, T0);
    expect(await attempt("2027", "fresh", T0)).toEqual({ status: "ok" });
    expect(await attempt("0000", "another", T0)).toEqual({ status: "wrong" });
    expect(await attempt("2027", "last", T0)).toMatchObject({ status: "paused" });
  });

  it("returns turnstile_failed without counting a PIN failure", async () => {
    turnstilePasses = false;
    for (let i = 0; i < CLIENT_LIMIT + 1; i++) {
      expect(await attempt("0000", "a", T0)).toEqual({ status: "turnstile_failed" });
    }
    turnstilePasses = true;
    expect(await attempt("2027", "a", T0)).toEqual({ status: "ok" });
  });
});

describe("session", () => {
  it("accepts a fresh session with the current PIN version", async () => {
    const cookie = await issueSession(SECRET, 1, T0);
    expect(await verifySession(cookie, SECRET, 1, T0 + 1000)).toBe(true);
  });

  it("rejects a session with an old PIN version", async () => {
    const cookie = await issueSession(SECRET, 1, T0);
    expect(await verifySession(cookie, SECRET, 2, T0 + 1000)).toBe(false);
  });

  it("rejects an expired or forged session", async () => {
    const cookie = await issueSession(SECRET, 1, T0);
    expect(await verifySession(cookie, SECRET, 1, T0 + 91 * 24 * 3600 * 1000)).toBe(false);
    expect(await verifySession(`${cookie}0`, SECRET, 1, T0)).toBe(false);
    expect(await verifySession(undefined, SECRET, 1, T0)).toBe(false);
  });
});
