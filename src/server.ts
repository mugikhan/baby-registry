import handler from "@tanstack/react-start/server-entry";
import { routeTree } from "./routeTree.gen";
import "./router";
import "./start";

function preloadComponent(component: unknown): Promise<unknown> | undefined {
  if (typeof component !== "function" || !("preload" in component)) return undefined;
  return typeof component.preload === "function" ? component.preload() : undefined;
}

// Evaluate the split route chunks at startup so the first request does not pay for them.
await Promise.all(
  Object.values(routeTree.children ?? {}).map((route) => preloadComponent(route.options.component)),
);

export default handler;
