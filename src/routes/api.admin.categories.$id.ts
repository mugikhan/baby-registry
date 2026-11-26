import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/db";
import { CategoryUpdateSchema, toFieldErrors } from "@/lib/admin-items";
import {
  forbidden,
  getAdminEmail,
  invalid,
  json,
  notFound,
  parseId,
  readJson,
} from "@/server/admin/http";
import { deleteCategory, updateCategory } from "@/server/admin/categories";

export const Route = createFileRoute("/api/admin/categories/$id")({
  server: {
    handlers: {
      PATCH: async ({ context, params, request }) => {
        const actorEmail = getAdminEmail(context);
        if (!actorEmail) return forbidden();
        const id = parseId(params.id);
        if (id === undefined) return notFound();
        const body = CategoryUpdateSchema.safeParse(await readJson(request));
        if (!body.success) return invalid(toFieldErrors(body.error));
        const result = await updateCategory(
          { db: getDb(), actorEmail, nowMs: Date.now() },
          { id, input: body.data },
        );
        return result.kind === "not-found" ? notFound() : json({ category: result.category });
      },
      DELETE: async ({ context, params }) => {
        const actorEmail = getAdminEmail(context);
        if (!actorEmail) return forbidden();
        const id = parseId(params.id);
        if (id === undefined) return notFound();
        const result = await deleteCategory({ db: getDb(), actorEmail, nowMs: Date.now() }, { id });
        if (result.kind === "not-found") return notFound();
        if (result.kind === "has-items") {
          const noun = result.itemCount === 1 ? "item" : "items";
          return json(
            {
              errors: {
                form: `This category still has ${result.itemCount} ${noun}. Move or delete them first.`,
              },
            },
            409,
          );
        }
        return json({ deleted: true });
      },
    },
  },
});
