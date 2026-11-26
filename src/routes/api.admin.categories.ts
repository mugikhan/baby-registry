import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/db";
import { CategoryInputSchema, toFieldErrors } from "@/lib/admin-items";
import { forbidden, getAdminEmail, invalid, json, readJson } from "@/server/admin/http";
import { createCategory, listCategories } from "@/server/admin/categories";

export const Route = createFileRoute("/api/admin/categories")({
  server: {
    handlers: {
      GET: async ({ context }) => {
        if (!getAdminEmail(context)) return forbidden();
        return json({ categories: await listCategories({ db: getDb() }) });
      },
      POST: async ({ context, request }) => {
        const actorEmail = getAdminEmail(context);
        if (!actorEmail) return forbidden();
        const body = CategoryInputSchema.safeParse(await readJson(request));
        if (!body.success) return invalid(toFieldErrors(body.error));
        const category = await createCategory(
          { db: getDb(), actorEmail, nowMs: Date.now() },
          body.data,
        );
        return json({ category }, 201);
      },
    },
  },
});
