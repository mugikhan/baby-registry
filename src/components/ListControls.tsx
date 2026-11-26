import { Link } from "@tanstack/react-router";
import { countNeededByCategory, type GuestListFilters } from "@/lib/list-filters";
import type { GuestList } from "@/lib/guest-list";
import { chipClass } from "@/components/chip";
import { cn } from "@/lib/utils";

type ListControlsProps = {
  list: GuestList;
  filters: GuestListFilters;
};

type ChipTarget = Pick<GuestListFilters, "category" | "funds">;

function Chip({
  target,
  active,
  needed,
  label,
  children,
}: {
  target: ChipTarget;
  active: boolean;
  needed: true | undefined;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to="/"
      search={{ category: target.category, funds: target.funds, needed }}
      aria-label={label}
      data-state={active ? "on" : "off"}
      activeOptions={{ exact: true, includeSearch: true }}
      className={chipClass}
    >
      {children}
    </Link>
  );
}

function Count({ count, active }: { count: number; active: boolean }) {
  if (count === 0) {
    return (
      <span className={cn("text-[14px] font-normal", active ? "text-white" : "text-ocean-muted")}>
        all taken
      </span>
    );
  }
  return (
    <span className="text-[14px] font-normal">
      <span className="tabular-nums">{count}</span> needed
    </span>
  );
}

export function ListControls({ list, filters }: ListControlsProps) {
  const needed = filters.needed === true;
  const neededFlag = filters.needed;
  const counts = countNeededByCategory(list);
  const usedCategories = new Set(list.items.map((item) => item.categoryId));
  const hasFund = list.items.some((item) => item.kind === "fund");
  const allActive = filters.category === undefined && !filters.funds;

  return (
    <div className="grid gap-3">
      <nav aria-label="Category" className="flex flex-wrap gap-2">
        <Chip target={{}} active={allActive} needed={neededFlag}>
          All
        </Chip>
        {list.categories
          .filter((category) => usedCategories.has(category.id))
          .map((category) => {
            const count = counts.get(category.id) ?? 0;
            return (
              <Chip
                key={category.id}
                target={{ category: category.id }}
                active={!filters.funds && filters.category === category.id}
                needed={neededFlag}
                label={`${category.name}, ${count === 0 ? "all taken" : `${count} needed`}`}
              >
                <span aria-hidden="true">{category.emoji}</span>
                {category.name}
                <Count count={count} active={!filters.funds && filters.category === category.id} />
              </Chip>
            );
          })}
        {hasFund && (
          <Chip target={{ funds: true }} active={filters.funds === true} needed={neededFlag}>
            <span aria-hidden="true">💰</span>
            Cash funds
          </Chip>
        )}
      </nav>

      <Link
        to="/"
        search={(prev) => ({ ...prev, needed: needed ? undefined : true })}
        aria-label={`Still needed only, ${needed ? "on" : "off"}`}
        data-state={needed ? "checked" : "unchecked"}
        className="group flex min-h-12 items-center gap-3 self-start"
      >
        <span className="relative h-8 w-14 shrink-0 rounded-full border-2 border-ocean bg-white transition-colors group-data-[state=checked]:bg-ocean">
          <span className="absolute top-1/2 left-1 block size-5 -translate-y-1/2 rounded-full bg-ocean transition-transform group-data-[state=checked]:translate-x-6 group-data-[state=checked]:bg-white" />
        </span>
        <span className="py-3 text-[18px] font-semibold text-ocean">Still needed only</span>
      </Link>
    </div>
  );
}
