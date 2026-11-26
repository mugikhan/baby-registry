import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/db";
import { forbidden, getAdminEmail, json, notFound, parseId } from "@/server/admin/http";
import { getItem } from "@/server/admin/items";

export const Route = createFileRoute("/api/admin/items/$id")({
  server: {
    handlers: {
      GET: async ({ context, params }) => {
        if (!getAdminEmail(context)) return forbidden();
        const id = parseId(params.id);
        const item = id === undefined ? undefined : await getItem({ db: getDb(), id });
        return item ? json({ item }) : notFound();
      },
    },
  },
});
