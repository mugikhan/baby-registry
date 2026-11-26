import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/db";
import { forbidden, getAdminEmail, json, notFound, parseId } from "@/server/admin/http";
import { duplicateItem } from "@/server/admin/items";

export const Route = createFileRoute("/api/admin/items/$id/duplicate")({
  server: {
    handlers: {
      POST: async ({ context, params }) => {
        const actorEmail = getAdminEmail(context);
        if (!actorEmail) return forbidden();
        const id = parseId(params.id);
        if (id === undefined) return notFound();
        const result = await duplicateItem({ db: getDb(), actorEmail, nowMs: Date.now() }, { id });
        return result.kind === "not-found" ? notFound() : json({ item: result.item }, 201);
      },
    },
  },
});
