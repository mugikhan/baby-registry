import "./zod-config";
import { createRouter } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { nonceFor } from "./server/csp";
import { routeTree } from "./routeTree.gen";

const requestNonce = createIsomorphicFn()
  .server(() => nonceFor(getRequest()))
  .client(() => undefined);

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    ssr: { nonce: requestNonce() },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
