import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/db";
import { ItemOrderSchema, toFieldErrors } from "@/lib/admin-items";
import {
  forbidden,
  getAdminEmail,
  invalid,
  json,
  notFound,
  parseId,
  readJson,
} from "@/server/admin/http";
import { reorderCategoryItems } from "@/server/admin/items";

export const Route = createFileRoute("/api/admin/categories/$id/order")({
  server: {
    handlers: {
      PUT: async ({ context, params, request }) => {
        const actorEmail = getAdminEmail(context);
        if (!actorEmail) return forbidden();
        const categoryId = parseId(params.id);
        if (categoryId === undefined) return notFound();
        const body = ItemOrderSchema.safeParse(await readJson(request));
        if (!body.success) return invalid(toFieldErrors(body.error));
        const result = await reorderCategoryItems(
          { db: getDb(), actorEmail, nowMs: Date.now() },
          { categoryId, itemIds: body.data.itemIds },
        );
        if (result.kind === "not-found") return notFound();
        if (result.kind === "invalid") return invalid(result.errors);
        return json({ reordered: true });
      },
    },
  },
});
