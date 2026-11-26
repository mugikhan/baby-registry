import { createMiddleware } from "@tanstack/react-start";
import { verifyAccessToken } from "./access-token";
import { getAdminConfig } from "./config";
import { isAdminPath } from "./paths";

const ACCESS_HEADER = "Cf-Access-Jwt-Assertion";

function forbidden() {
  return new Response("Forbidden", { status: 403 });
}

export const adminGate = createMiddleware({ type: "request" }).server(
  async ({ request, pathname, next }) => {
    if (!isAdminPath(pathname)) return next();

    const config = getAdminConfig();
    if (!config) return forbidden();
    if (new URL(request.url).host.toLowerCase() !== config.adminHost) {
      return new Response("Not found", { status: 404 });
    }

    const token = request.headers.get(ACCESS_HEADER);
    if (!token) return forbidden();
    const result = await verifyAccessToken(token, config.access, Date.now());
    if (result.kind === "refused") return forbidden();
    return next({ context: { adminEmail: result.email } });
  },
);
