const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileVerifier = (token: string, clientKey: string) => Promise<boolean>;

export function createTurnstileVerifier(secret: string): TurnstileVerifier {
  return async (token, clientKey) => {
    if (!token) return false;
    try {
      const response = await fetch(SITEVERIFY_URL, {
        method: "POST",
        body: new URLSearchParams({ secret, response: token, remoteip: clientKey }),
      });
      const result = (await response.json()) as { success?: boolean };
      return result.success === true;
    } catch {
      return false;
    }
  };
}
