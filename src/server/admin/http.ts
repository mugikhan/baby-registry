import { z } from "zod";
import type { FieldErrors } from "@/lib/admin-items";

const AdminContextSchema = z.object({ adminEmail: z.email() });
const IdSchema = z.coerce.number().int().positive();
const NO_STORE = { "Cache-Control": "no-store" };

export function getAdminEmail(context: unknown): string | undefined {
  const admin = AdminContextSchema.safeParse(context);
  return admin.success ? admin.data.adminEmail : undefined;
}

export function forbidden() {
  return new Response("Forbidden", { status: 403 });
}

export function notFound() {
  return Response.json({ errors: { form: "Not found" } }, { status: 404, headers: NO_STORE });
}

export function invalid(errors: FieldErrors) {
  return Response.json({ errors }, { status: 400, headers: NO_STORE });
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

export function parseId(raw: string): number | undefined {
  const id = IdSchema.safeParse(raw);
  return id.success ? id.data : undefined;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
