import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/db";
import { forbidden, getAdminEmail, json } from "@/server/admin/http";
import { listCategories } from "@/server/admin/items";

export const Route = createFileRoute("/api/admin/categories")({
  server: {
    handlers: {
      GET: async ({ context }) => {
        if (!getAdminEmail(context)) return forbidden();
        return json({ categories: await listCategories({ db: getDb() }) });
      },
    },
  },
});
