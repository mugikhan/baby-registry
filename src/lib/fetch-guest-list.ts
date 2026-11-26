import { redirect } from "@tanstack/react-router";
import { GuestListSchema, type GuestList } from "./guest-list";

export async function fetchGuestList(returnTo: string): Promise<GuestList> {
  const response = await fetch("/api/list", { credentials: "same-origin" });
  if (response.status === 401) throw redirect({ to: "/pin", search: { next: returnTo } });
  if (!response.ok) throw new Error(`The list request failed with ${response.status}`);
  return GuestListSchema.parse(await response.json());
}
