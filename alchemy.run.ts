import { appendFileSync } from "node:fs";
import alchemy from "alchemy";
import { D1Database, R2Bucket, TanStackStart } from "alchemy/cloudflare";
import { GitHubComment } from "alchemy/github";
import { CloudflareStateStore } from "alchemy/state";
import { z } from "zod";

const EnvSchema = z.object({
  STAGE: z.string().regex(/^(prod|pr-\d+)$/, "STAGE must be prod or pr-<number>"),
  FAMILY_PIN: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  TURNSTILE_SITE_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  ALCHEMY_STATE_TOKEN: z.string().min(1),
  ALCHEMY_PASSWORD: z.string().min(1),
  ORGANISER_EMAILS: z.string().min(1).optional(),
  GITHUB_OUTPUT: z.string().min(1).optional(),
});

const PreviewEnvSchema = z.object({
  PULL_REQUEST: z.coerce.number().int().positive(),
  COMMIT_SHA: z.string().min(1),
});

const env = EnvSchema.parse(process.env);
const stage = env.STAGE;
const isPreview = stage !== "prod";
const preview = isPreview ? PreviewEnvSchema.parse(process.env) : undefined;

const adminBindings: Record<string, string | ReturnType<typeof alchemy.secret>> =
  stage === "prod"
    ? {
        ACCESS_ISSUER: "https://mugikhan.cloudflareaccess.com",
        ACCESS_AUD: "54c107dca9b8d556e83e32c83abd81598b3e1f91f4009336bb3a0bb6d9428c14",
        ADMIN_HOST: "baby-registry-prod.mugikhan.workers.dev",
        ORGANISER_EMAILS: alchemy.secret(
          z
            .string({ error: "ORGANISER_EMAILS is required when STAGE=prod" })
            .min(1)
            .parse(env.ORGANISER_EMAILS),
        ),
      }
    : {};

const app = await alchemy("baby-registry", {
  stage,
  stateStore: (scope) => new CloudflareStateStore(scope, { scriptName: "baby-registry-state" }),
});

// Never rename a resource: a new name creates an empty one.
const db = await D1Database("db", {
  adopt: true,
  name: `baby-registry-db-${stage}`,
  migrationsDir: "drizzle",
  // Western Europe is the closest D1 region to guests in South Africa.
  primaryLocationHint: "weur",
  delete: isPreview,
});

const images = await R2Bucket("images", {
  adopt: true,
  name: `baby-registry-images-${stage}`,
  empty: isPreview,
  delete: isPreview,
});

const web = await TanStackStart("web", {
  adopt: true,
  name: `baby-registry-${stage}`,
  url: true,
  compatibilityDate: "2026-11-01",
  compatibilityFlags: ["nodejs_compat"],
  observability: { enabled: true },
  placement: { mode: "smart" },
  bindings: {
    DB: db,
    IMAGES: images,
    FAMILY_PIN: alchemy.secret(env.FAMILY_PIN),
    SESSION_SECRET: alchemy.secret(env.SESSION_SECRET),
    TURNSTILE_SITE_KEY: env.TURNSTILE_SITE_KEY,
    TURNSTILE_SECRET_KEY: alchemy.secret(env.TURNSTILE_SECRET_KEY),
    ...adminBindings,
  },
});

if (preview) {
  await GitHubComment("preview-comment", {
    owner: "mugikhan",
    repository: "baby-registry",
    issueNumber: preview.PULL_REQUEST,
    body: `Preview: ${web.url}\n\nCommit: ${preview.COMMIT_SHA}`,
  });
}

console.log({ url: web.url, d1Name: db.name, d1Id: db.id });

if (env.GITHUB_OUTPUT) {
  appendFileSync(env.GITHUB_OUTPUT, `url=${web.url}\nd1_name=${db.name}\nd1_id=${db.id}\n`);
}

await app.finalize();
