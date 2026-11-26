import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { getGuestList } from "@/server/guest-list";

export const Route = createFileRoute("/api/list")({
  server: {
    handlers: {
      GET: async () => {
        const db = getDb();
        const [row, list] = await Promise.all([
          db.query.settings.findFirst({ where: eq(settings.id, 1) }),
          getGuestList({ db }),
        ]);
        return Response.json(
          { title: row?.title ?? "Ayesha & Mughees", ...list },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
