import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { chipClass } from "@/components/chip";
import { TextInput } from "@/components/admin/fields";
import type { AdminListFilters } from "@/lib/admin-filters";
import type { AdminItem } from "@/lib/admin-items";

type Patch = Partial<AdminListFilters>;

function Chip({
  filters,
  patch,
  active,
  children,
}: {
  filters: AdminListFilters;
  patch: Patch;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to="/admin"
      search={{ ...filters, ...patch }}
      data-state={active ? "on" : "off"}
      className={chipClass}
    >
      {children}
    </Link>
  );
}

function usedCategories(items: AdminItem[]) {
  const seen = new Map<number, { id: number; name: string; emoji: string }>();
  for (const item of items) {
    if (!seen.has(item.categoryId)) {
      seen.set(item.categoryId, {
        id: item.categoryId,
        name: item.categoryName,
        emoji: item.categoryEmoji,
      });
    }
  }
  return [...seen.values()];
}

const TYPES = [
  { value: undefined, label: "All" },
  { value: "gift", label: "Gifts" },
  { value: "fund", label: "Funds" },
] as const;

const STATUSES = [
  { value: undefined, label: "All" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

export function ListFilters({ items, filters }: { items: AdminItem[]; filters: AdminListFilters }) {
  const navigate = useNavigate();
  const [text, setText] = useState(filters.q ?? "");
  const [syncedQ, setSyncedQ] = useState(filters.q);
  if (filters.q !== syncedQ) {
    setSyncedQ(filters.q);
    setText(filters.q ?? "");
  }

  function search(value: string) {
    setText(value);
    void navigate({
      to: "/admin",
      search: { ...filters, q: value === "" ? undefined : value },
      replace: true,
    });
  }

  return (
    <div className="mt-6 grid gap-4">
      <label className="grid gap-1 text-[18px] font-semibold text-ink">
        Search items
        <TextInput
          type="search"
          value={text}
          onChange={(event) => search(event.target.value)}
          autoComplete="off"
        />
      </label>
      <nav aria-label="Filter by type" className="flex flex-wrap gap-2">
        {TYPES.map((option) => (
          <Chip
            key={option.label}
            filters={filters}
            patch={{ type: option.value }}
            active={filters.type === option.value}
          >
            {option.label}
          </Chip>
        ))}
      </nav>
      <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
        <Chip
          filters={filters}
          patch={{ category: undefined }}
          active={filters.category === undefined}
        >
          All
        </Chip>
        {usedCategories(items).map((category) => (
          <Chip
            key={category.id}
            filters={filters}
            patch={{ category: category.id }}
            active={filters.category === category.id}
          >
            <span aria-hidden="true">{category.emoji}</span>
            {category.name}
          </Chip>
        ))}
      </nav>
      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {STATUSES.map((option) => (
          <Chip
            key={option.label}
            filters={filters}
            patch={{ status: option.value }}
            active={filters.status === option.value}
          >
            {option.label}
          </Chip>
        ))}
      </nav>
    </div>
  );
}
