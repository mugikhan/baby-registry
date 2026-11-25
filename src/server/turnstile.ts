import { z } from "zod";
import type { ClientKey, TurnstileToken } from "./brands";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const SiteverifySchema = z.object({ success: z.boolean() });

export type TurnstileVerifier = (args: {
  token: TurnstileToken;
  clientKey: ClientKey;
}) => Promise<boolean>;

export function createTurnstileVerifier(secret: string): TurnstileVerifier {
  return async ({ token, clientKey }) => {
    try {
      const response = await fetch(SITEVERIFY_URL, {
        method: "POST",
        body: new URLSearchParams({ secret, response: token, remoteip: clientKey }),
      });
      const result = SiteverifySchema.safeParse(await response.json());
      return result.success && result.data.success;
    } catch {
      return false;
    }
  };
}
