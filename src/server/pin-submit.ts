import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { safeNext } from "./safe-next";
import { attemptPin } from "./pin-attempt";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, issueSession } from "./session";
import { createTurnstileVerifier } from "./turnstile";

const ALWAYS_FAIL_SECRET = "2x0000000000000000000000000000000AA";
const ERROR_FOR_STATUS = {
  wrong: "wrong",
  locked: "locked",
  paused: "paused",
  turnstile_failed: "turnstile",
} as const;

function redirect(request: Request, path: string, cookie?: string): Response {
  const headers = new Headers({ Location: new URL(path, request.url).toString() });
  if (cookie) headers.set("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

export async function handlePinSubmit(request: Request): Promise<Response> {
  const form = await request.formData();
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
  };
  const next = safeNext(field("next"));
  const now = Date.now();

  // Tests send this header to exercise the Turnstile failure path. Production ignores it.
  const useFailSecret = !import.meta.env.PROD && request.headers.has("x-test-turnstile-fail");
  const result = await attemptPin(
    {
      db: getDb(),
      familyPin: env.FAMILY_PIN,
      secret: env.SESSION_SECRET,
      verifyTurnstile: createTurnstileVerifier(
        useFailSecret ? ALWAYS_FAIL_SECRET : env.TURNSTILE_SECRET_KEY,
      ),
    },
    {
      pin: field("pin"),
      turnstileToken: field("cf-turnstile-response"),
      clientKey: request.headers.get("cf-connecting-ip") ?? "local",
      now,
    },
  );

  if (result.status !== "ok") {
    const params = new URLSearchParams({ error: ERROR_FOR_STATUS[result.status] });
    if (next !== "/") params.set("next", next);
    return redirect(request, `/pin?${params}`);
  }

  const row = await getDb().query.settings.findFirst({ where: eq(settings.id, 1) });
  const value = await issueSession(env.SESSION_SECRET, row?.pinVersion ?? 1, now);
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const cookie = `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${secure}`;
  return redirect(request, next, cookie);
}
