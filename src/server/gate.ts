import { createMiddleware } from "@tanstack/react-start";

export const sessionGate = createMiddleware({ type: "request" }).server(
  async ({ request, pathname, handlerType, next }) => {
    // Import inside the handler so the client bundle never sees `cloudflare:workers`.
    const { hasValidSession } = await import("./has-session");
    if (pathname === "/pin" || (await hasValidSession(request))) return next();

    if (handlerType === "serverFn" || pathname.startsWith("/api/")) {
      return new Response("Unauthorized", { status: 401 });
    }
    const target = new URL("/pin", request.url);
    if (request.method === "GET" || request.method === "HEAD") {
      const url = new URL(request.url);
      target.searchParams.set("next", url.pathname + url.search);
    }
    return Response.redirect(target, 302);
  },
);
