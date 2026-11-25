import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { CircleAlert } from "lucide-react";
import { z } from "zod";
import { AirmailEdge } from "@/components/AirmailEdge";
import { PinErrorSchema, type PinError } from "@/lib/pin-error";
import { getServerConfig } from "@/server/config";
import { handlePinSubmit } from "@/server/pin-submit";

const getTurnstileSiteKey = createServerFn({ method: "GET" }).handler(
  () => getServerConfig().turnstileSiteKey,
);

const messages = {
  wrong: "That PIN didn't work. Check the invite message and try again.",
  locked: "Too many tries. Please wait 15 minutes and try again.",
  paused: "The registry is resting for a little while. Please try again in an hour.",
  turnstile: "We couldn't check you're human. Please try again.",
} satisfies Record<PinError, string>;

const SearchSchema = z.object({
  error: PinErrorSchema.optional().catch(undefined),
  next: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/pin")({
  validateSearch: SearchSchema,
  loader: () => getTurnstileSiteKey(),
  head: () => ({
    meta: [{ title: "Family PIN · Baby Khan" }],
    scripts: [
      {
        src: "https://challenges.cloudflare.com/turnstile/v0/api.js",
        async: true,
        defer: true,
      },
    ],
  }),
  server: { handlers: { POST: ({ request }) => handlePinSubmit(request) } },
  component: PinPage,
});

function PinPage() {
  const siteKey = Route.useLoaderData();
  const { error, next } = Route.useSearch();
  const closed = error === "locked" || error === "paused";

  return (
    <>
      <AirmailEdge />
      <main className="mx-auto max-w-[26rem] px-5 pt-10 pb-12">
        <h1 className="text-[34px] leading-[1.05] font-extrabold tracking-[-0.01em] text-ink">
          Enter the family PIN
        </h1>
        <p className="mt-3 text-[18px] text-ink">
          You'll find the 4-digit PIN in the invite message we sent you.
        </p>

        {error && (
          <div
            id="pin-error"
            role="alert"
            className="mt-6 flex gap-3 rounded-[10px] bg-sand p-4 text-[18px] text-ink"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-ocean" />
            <p>{messages[error]}</p>
          </div>
        )}

        {!closed && (
          <form method="post" action="/pin" className="mt-6 grid gap-4">
            {next && <input type="hidden" name="next" value={next} />}
            <div className="grid gap-2">
              <label htmlFor="pin" className="text-[16px] font-semibold text-ink">
                Family PIN
              </label>
              <input
                id="pin"
                name="pin"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{4}"
                maxLength={4}
                required
                autoFocus={!!error}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "pin-error" : undefined}
                className="h-12 w-full rounded-xl border-2 border-ocean bg-white px-4 text-[18px] tracking-[0.4em] text-ink tabular-nums"
              />
            </div>
            <div
              className="cf-turnstile"
              data-sitekey={siteKey}
              data-appearance="interaction-only"
              suppressHydrationWarning
              dangerouslySetInnerHTML={{ __html: "" }}
            />
            <noscript>
              <p className="text-[16px] text-ocean-muted">
                The security check needs JavaScript. Please turn it on, then reload this page.
              </p>
            </noscript>
            <button
              type="submit"
              className="min-h-12 w-full rounded-xl bg-ocean px-5 text-[18px] font-bold text-white hover:bg-ocean-hover active:bg-ocean-pressed"
            >
              Continue
            </button>
          </form>
        )}
      </main>
    </>
  );
}
