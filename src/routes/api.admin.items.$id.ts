import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/db";
import { ItemUpdateSchema, toFieldErrors } from "@/lib/admin-items";
import {
  forbidden,
  getAdminEmail,
  invalid,
  json,
  notFound,
  parseId,
  readJson,
} from "@/server/admin/http";
import { deleteItem, getItem, updateItem } from "@/server/admin/items";

const RESERVED_MESSAGE =
  "Guests have reserved this item, so it cannot be deleted. Archive it instead.";

export const Route = createFileRoute("/api/admin/items/$id")({
  server: {
    handlers: {
      GET: async ({ context, params }) => {
        if (!getAdminEmail(context)) return forbidden();
        const id = parseId(params.id);
        const item = id === undefined ? undefined : await getItem({ db: getDb(), id });
        return item ? json({ item }) : notFound();
      },
      PATCH: async ({ context, params, request }) => {
        const actorEmail = getAdminEmail(context);
        if (!actorEmail) return forbidden();
        const id = parseId(params.id);
        if (id === undefined) return notFound();
        const body = ItemUpdateSchema.safeParse(await readJson(request));
        if (!body.success) return invalid(toFieldErrors(body.error));
        const result = await updateItem(
          { db: getDb(), actorEmail, nowMs: Date.now() },
          { id, input: body.data },
        );
        if (result.kind === "not-found") return notFound();
        if (result.kind === "invalid") return invalid(result.errors);
        return json({ item: result.item });
      },
      DELETE: async ({ context, params }) => {
        const actorEmail = getAdminEmail(context);
        if (!actorEmail) return forbidden();
        const id = parseId(params.id);
        if (id === undefined) return notFound();
        const result = await deleteItem({ db: getDb(), actorEmail, nowMs: Date.now() }, { id });
        if (result.kind === "not-found") return notFound();
        if (result.kind === "reserved") return json({ errors: { form: RESERVED_MESSAGE } }, 409);
        return json({ deleted: true });
      },
    },
  },
});
