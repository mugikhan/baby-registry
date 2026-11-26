import { env } from "cloudflare:workers";
import { z } from "zod";
import { JwksSchema, type AccessConfig } from "./access-token";

const AdminEnvSchema = z
  .object({
    ACCESS_ISSUER: z.url().transform((url) => url.replace(/\/+$/, "")),
    ACCESS_AUD: z.string().min(1),
    ADMIN_HOST: z.string().min(1),
    ORGANISER_EMAILS: z
      .string()
      .transform((list) =>
        list
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter((email) => email.length > 0),
      )
      .pipe(z.array(z.email()).min(1)),
    ACCESS_JWKS: z
      .string()
      .transform((text, ctx) => {
        try {
          return JwksSchema.parse(JSON.parse(text));
        } catch {
          ctx.addIssue({ code: "custom", message: "ACCESS_JWKS is not a valid JWKS" });
          return z.NEVER;
        }
      })
      .refine((jwks) => jwks.keys.length > 0, { message: "ACCESS_JWKS has no RSA key" })
      .optional(),
  })
  .transform((vars): AdminConfig => ({
    adminHost: vars.ADMIN_HOST.toLowerCase(),
    access: {
      issuer: vars.ACCESS_ISSUER,
      audience: vars.ACCESS_AUD,
      organiserEmails: new Set(vars.ORGANISER_EMAILS),
      ...(vars.ACCESS_JWKS ? { jwks: vars.ACCESS_JWKS } : {}),
    },
  }));

export interface AdminConfig {
  adminHost: string;
  access: AccessConfig;
}

export function parseAdminConfig(vars: unknown): AdminConfig | undefined {
  const result = AdminEnvSchema.safeParse(vars);
  return result.success ? result.data : undefined;
}

let cached: { config: AdminConfig | undefined } | undefined;

export function getAdminConfig(): AdminConfig | undefined {
  cached ??= { config: parseAdminConfig(env) };
  return cached.config;
}
