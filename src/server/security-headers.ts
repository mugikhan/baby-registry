import { createMiddleware } from "@tanstack/react-start";
import { SECURITY_HEADERS, buildCsp, createNonce, rememberNonce } from "./csp";

export const securityHeaders = createMiddleware({ type: "request" }).server(
  async ({ request, next }) => {
    const nonce = createNonce();
    rememberNonce(request, nonce);
    const { response } = await next();
    // Response.redirect() headers are immutable, so copy into a fresh Response.
    const secured = new Response(response.body, response);
    secured.headers.set("Content-Security-Policy", buildCsp(nonce, import.meta.env.DEV));
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      secured.headers.set(name, value);
    }
    return secured;
  },
);
