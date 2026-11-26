import { createStart } from "@tanstack/react-start";
import { adminGate } from "./server/admin/gate";
import { sessionGate } from "./server/gate";
import { securityHeaders } from "./server/security-headers";

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders, adminGate, sessionGate],
}));
