import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/db";
import { CategoryOrderSchema, toFieldErrors } from "@/lib/admin-items";
import { forbidden, getAdminEmail, invalid, json, readJson } from "@/server/admin/http";
import { reorderCategories } from "@/server/admin/categories";

export const Route = createFileRoute("/api/admin/categories/order")({
  server: {
    handlers: {
      PUT: async ({ context, request }) => {
        const actorEmail = getAdminEmail(context);
        if (!actorEmail) return forbidden();
        const body = CategoryOrderSchema.safeParse(await readJson(request));
        if (!body.success) return invalid(toFieldErrors(body.error));
        const result = await reorderCategories(
          { db: getDb(), actorEmail, nowMs: Date.now() },
          body.data,
        );
        return result.kind === "invalid" ? invalid(result.errors) : json({ reordered: true });
      },
    },
  },
});
