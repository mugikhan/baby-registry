import { createStart } from "@tanstack/react-start";
import { sessionGate } from "./server/gate";
import { securityHeaders } from "./server/security-headers";

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders, sessionGate],
}));
