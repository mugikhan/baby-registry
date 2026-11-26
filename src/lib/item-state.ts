import type { GuestListCategory, GuestListItem } from "@/lib/guest-list";

export type ItemState = "needed" | "partly" | "taken" | "fund";

export function getItemState(item: GuestListItem): ItemState {
  switch (item.kind) {
    case "fund":
      return "fund";
    case "gift":
      if (item.taken >= item.qty) return "taken";
      return item.taken > 0 ? "partly" : "needed";
    default: {
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}

export function getPicture(item: GuestListItem, category: GuestListCategory | undefined) {
  return item.emoji ?? category?.emoji ?? "🎁";
}

export function joinNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
