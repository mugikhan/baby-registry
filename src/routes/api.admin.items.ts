import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/db";
import { ItemInputSchema, toFieldErrors } from "@/lib/admin-items";
import { forbidden, getAdminEmail, invalid, json, readJson } from "@/server/admin/http";
import { createItem, listItems } from "@/server/admin/items";

export const Route = createFileRoute("/api/admin/items")({
  server: {
    handlers: {
      GET: async ({ context }) => {
        if (!getAdminEmail(context)) return forbidden();
        return json({ items: await listItems({ db: getDb() }) });
      },
      POST: async ({ context, request }) => {
        const actorEmail = getAdminEmail(context);
        if (!actorEmail) return forbidden();
        const body = ItemInputSchema.safeParse(await readJson(request));
        if (!body.success) return invalid(toFieldErrors(body.error));
        const result = await createItem({ db: getDb(), actorEmail, nowMs: Date.now() }, body.data);
        if (result.kind === "invalid") return invalid(result.errors);
        return json({ item: result.item }, 201);
      },
    },
  },
});
