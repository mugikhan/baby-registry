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
import {
  ClientKeySchema,
  PinSchema,
  SessionSecretSchema,
  TurnstileTokenSchema,
} from "@/server/brands";
import { issueSession, verifySession } from "@/server/session";

const db = drizzle(env.DB, { schema });
const T0 = Date.UTC(2027, 0, 1);
const SECRET = SessionSecretSchema.parse("test-session-secret-at-least-32-bytes-long-0123456789");
const TOKEN = TurnstileTokenSchema.parse("token");

let turnstilePasses = true;
let turnstileCalls = 0;

function attempt(pin: string, clientKey: string, now: number): Promise<PinAttemptResult> {
  return attemptPin(
    {
      db,
      familyPin: PinSchema.parse("2027"),
      secret: SECRET,
      verifyTurnstile: async () => {
        turnstileCalls++;
        return turnstilePasses;
      },
    },
    {
      pin: PinSchema.parse(pin),
      turnstileToken: TOKEN,
      clientKey: ClientKeySchema.parse(clientKey),
      now,
    },
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
    expect(await attempt("2027", "a", T0)).toEqual({ kind: "ok" });
  });

  it("rejects a wrong PIN", async () => {
    expect(await attempt("1234", "a", T0)).toEqual({ kind: "wrong" });
  });

  it("locks a client on the 6th wrong try and leaves other clients alone", async () => {
    await failTimes(CLIENT_LIMIT, "a", T0);
    expect(await attempt("0000", "a", T0 + 1000)).toEqual({
      kind: "locked",
      until: T0 + CLIENT_WINDOW_MS,
    });
    expect(await attempt("2027", "a", T0 + 1000)).toMatchObject({ kind: "locked" });
    expect(await attempt("0000", "b", T0 + 1000)).toEqual({ kind: "wrong" });
  });

  it("lets a locked client try again after the window", async () => {
    await failTimes(CLIENT_LIMIT, "a", T0);
    expect(await attempt("2027", "a", T0 + CLIENT_WINDOW_MS)).toEqual({ kind: "ok" });
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
      kind: "paused",
      until: T0 + GLOBAL_WINDOW_MS,
    });
    expect(await attempt("0000", "fresh", late)).toMatchObject({ kind: "paused" });
  });

  it("works again after the global hour", async () => {
    for (let i = 0; i < GLOBAL_LIMIT; i++) await attempt("0000", `client-${i}`, T0);
    expect(await attempt("2027", "fresh", T0 + GLOBAL_WINDOW_MS)).toEqual({ kind: "ok" });
  });

  it("keeps the global count after a correct PIN", async () => {
    for (let i = 0; i < GLOBAL_LIMIT - 1; i++) await attempt("0000", `client-${i}`, T0);
    expect(await attempt("2027", "fresh", T0)).toEqual({ kind: "ok" });
    expect(await attempt("0000", "another", T0)).toEqual({ kind: "wrong" });
    expect(await attempt("2027", "last", T0)).toMatchObject({ kind: "paused" });
  });

  it("returns turnstile_failed without counting a PIN failure", async () => {
    turnstilePasses = false;
    for (let i = 0; i < CLIENT_LIMIT + 1; i++) {
      expect(await attempt("0000", "a", T0)).toEqual({ kind: "turnstile_failed" });
    }
    turnstilePasses = true;
    expect(await attempt("2027", "a", T0)).toEqual({ kind: "ok" });
  });
});

describe("session", () => {
  it("accepts a fresh session with the current PIN version", async () => {
    const cookie = await issueSession({ secret: SECRET, pinVersion: 1, nowMs: T0 });
    expect(
      await verifySession({ value: cookie, secret: SECRET, pinVersion: 1, nowMs: T0 + 1000 }),
    ).toBe(true);
  });

  it("rejects a session with an old PIN version", async () => {
    const cookie = await issueSession({ secret: SECRET, pinVersion: 1, nowMs: T0 });
    expect(
      await verifySession({ value: cookie, secret: SECRET, pinVersion: 2, nowMs: T0 + 1000 }),
    ).toBe(false);
  });

  it("rejects an expired or forged session", async () => {
    const cookie = await issueSession({ secret: SECRET, pinVersion: 1, nowMs: T0 });
    expect(
      await verifySession({
        value: cookie,
        secret: SECRET,
        pinVersion: 1,
        nowMs: T0 + 91 * 24 * 3600 * 1000,
      }),
    ).toBe(false);
    expect(
      await verifySession({ value: `${cookie}0`, secret: SECRET, pinVersion: 1, nowMs: T0 }),
    ).toBe(false);
    expect(
      await verifySession({ value: undefined, secret: SECRET, pinVersion: 1, nowMs: T0 }),
    ).toBe(false);
  });
});
