import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import type { PinError } from "@/lib/pin-error";
import { ClientKeySchema, PinSchema, TurnstileTokenSchema } from "./brands";
import { getServerConfig } from "./config";
import { attemptPin, type PinAttemptResult } from "./pin-attempt";
import { safeNext } from "./safe-next";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, issueSession } from "./session";
import { createTurnstileVerifier } from "./turnstile";

const ALWAYS_FAIL_SECRET = "2x0000000000000000000000000000000AA";
const TURNSTILE_FIELD = "cf-turnstile-response";
const ERROR_FOR_KIND = {
  wrong: "wrong",
  locked: "locked",
  paused: "paused",
  turnstile_failed: "turnstile",
} satisfies Record<Exclude<PinAttemptResult["kind"], "ok">, PinError>;

const PinFormSchema = z.object({
  pin: PinSchema,
  [TURNSTILE_FIELD]: TurnstileTokenSchema,
});

function redirect(request: Request, path: string, cookie?: string): Response {
  const headers = new Headers({ Location: new URL(path, request.url).toString() });
  if (cookie) headers.set("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

function errorRedirect(request: Request, error: PinError, next: string): Response {
  const params = new URLSearchParams({ error });
  if (next !== "/") params.set("next", next);
  return redirect(request, `/pin?${params}`);
}

export async function handlePinSubmit(request: Request): Promise<Response> {
  const form = await request.formData();
  const next = safeNext(form.get("next"));
  const now = Date.now();
  const config = getServerConfig();

  const parsed = PinFormSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const missingToken = parsed.error.issues.some((issue) => issue.path[0] === TURNSTILE_FIELD);
    return errorRedirect(request, missingToken ? "turnstile" : "wrong", next);
  }

  // Tests send this header to exercise the Turnstile failure path. Production ignores it.
  const useFailSecret = !import.meta.env.PROD && request.headers.has("x-test-turnstile-fail");
  const result = await attemptPin(
    {
      db: getDb(),
      familyPin: config.familyPin,
      secret: config.sessionSecret,
      verifyTurnstile: createTurnstileVerifier(
        useFailSecret ? ALWAYS_FAIL_SECRET : config.turnstileSecretKey,
      ),
    },
    {
      pin: parsed.data.pin,
      turnstileToken: parsed.data[TURNSTILE_FIELD],
      clientKey: ClientKeySchema.parse(request.headers.get("cf-connecting-ip") || "local"),
      now,
    },
  );

  if (result.kind !== "ok") return errorRedirect(request, ERROR_FOR_KIND[result.kind], next);

  const row = await getDb().query.settings.findFirst({ where: eq(settings.id, 1) });
  const value = await issueSession({
    secret: config.sessionSecret,
    pinVersion: row?.pinVersion ?? 1,
    nowMs: now,
  });
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const cookie = `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${secure}`;
  return redirect(request, next, cookie);
}
