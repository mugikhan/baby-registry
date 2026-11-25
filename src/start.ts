import { createStart } from "@tanstack/react-start";
import { sessionGate } from "./server/gate";

export const startInstance = createStart(() => ({
  requestMiddleware: [sessionGate],
}));
