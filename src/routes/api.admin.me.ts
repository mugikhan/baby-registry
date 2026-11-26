import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const AdminContextSchema = z.object({ adminEmail: z.email() });

export const Route = createFileRoute("/api/admin/me")({
  server: {
    handlers: {
      GET: ({ context }) => {
        const admin = AdminContextSchema.safeParse(context);
        if (!admin.success) return new Response("Forbidden", { status: 403 });
        return Response.json(
          { email: admin.data.adminEmail },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
