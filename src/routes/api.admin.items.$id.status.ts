import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/db";
import { StatusInputSchema, toFieldErrors } from "@/lib/admin-items";
import {
  forbidden,
  getAdminEmail,
  invalid,
  json,
  notFound,
  parseId,
  readJson,
} from "@/server/admin/http";
import { setItemStatus } from "@/server/admin/items";

export const Route = createFileRoute("/api/admin/items/$id/status")({
  server: {
    handlers: {
      POST: async ({ context, params, request }) => {
        const actorEmail = getAdminEmail(context);
        if (!actorEmail) return forbidden();
        const id = parseId(params.id);
        if (id === undefined) return notFound();
        const body = StatusInputSchema.safeParse(await readJson(request));
        if (!body.success) return invalid(toFieldErrors(body.error));
        const result = await setItemStatus(
          { db: getDb(), actorEmail, nowMs: Date.now() },
          { id, status: body.data.status },
        );
        return result.kind === "not-found" ? notFound() : json({ item: result.item });
      },
    },
  },
});
