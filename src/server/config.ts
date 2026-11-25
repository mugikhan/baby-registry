import { env } from "cloudflare:workers";
import { z } from "zod";
import { PinSchema, SessionSecretSchema } from "./brands";

const ConfigSchema = z
  .object({
    FAMILY_PIN: PinSchema,
    SESSION_SECRET: SessionSecretSchema,
    TURNSTILE_SECRET_KEY: z.string().min(1),
    TURNSTILE_SITE_KEY: z.string().min(1),
  })
  .transform((vars) => ({
    familyPin: vars.FAMILY_PIN,
    sessionSecret: vars.SESSION_SECRET,
    turnstileSecretKey: vars.TURNSTILE_SECRET_KEY,
    turnstileSiteKey: vars.TURNSTILE_SITE_KEY,
  }));

export type ServerConfig = z.infer<typeof ConfigSchema>;

let cached: ServerConfig | undefined;

export function getServerConfig(): ServerConfig {
  cached ??= ConfigSchema.parse(env);
  return cached;
}
