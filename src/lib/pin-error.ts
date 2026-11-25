import { z } from "zod";

export const PinErrorSchema = z.enum(["wrong", "locked", "paused", "turnstile"]);

export type PinError = z.infer<typeof PinErrorSchema>;
