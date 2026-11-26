import { createMiddleware } from "@tanstack/react-start";
import { isAdminPath } from "./admin/paths";
import { hasValidSession } from "./has-session";

export const sessionGate = createMiddleware({ type: "request" }).server(
  async ({ request, pathname, handlerType, next }) => {
    if (pathname === "/pin" || isAdminPath(pathname) || (await hasValidSession(request)))
      return next();

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
