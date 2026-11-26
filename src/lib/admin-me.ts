import { z } from "zod";

const AdminMeSchema = z.object({ email: z.email() });

export type AdminMe = z.infer<typeof AdminMeSchema>;

export async function fetchAdminMe(): Promise<AdminMe> {
  const response = await fetch("/api/admin/me", { credentials: "same-origin" });
  if (!response.ok) throw new Error(`The admin request failed with ${response.status}`);
  return AdminMeSchema.parse(await response.json());
}
