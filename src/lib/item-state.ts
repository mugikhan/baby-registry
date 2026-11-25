import type { Category, RegistryItem } from "./sample-items";

export type ItemState = "needed" | "partly" | "taken" | "yours" | "fund";

export function getItemState(item: RegistryItem): ItemState {
  if (item.type === "fund") return "fund";
  if (item.yours) return "yours";
  const left = item.qty - item.takenBy.length;
  if (left <= 0) return "taken";
  return item.takenBy.length > 0 ? "partly" : "needed";
}

export function getPicture(item: RegistryItem, category: Category | undefined) {
  return item.emoji ?? category?.emoji ?? "🎁";
}

export function joinNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function matchesQuery(item: RegistryItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${item.title} ${item.note}`.toLowerCase().includes(q);
}

export function sortTakenLast(items: RegistryItem[]) {
  return [...items].sort(
    (a, b) => Number(getItemState(a) === "taken") - Number(getItemState(b) === "taken"),
  );
}
