import { Search } from "lucide-react";
import { Switch, ToggleGroup } from "radix-ui";
import type { GuestListCategory } from "@/server/guest-list";
import { cn } from "@/lib/utils";

type ListControlsProps = {
  categories: GuestListCategory[];
  query: string;
  onQueryChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  neededOnly: boolean;
  onNeededOnlyChange: (value: boolean) => void;
};

const chipClass = cn(
  "inline-flex min-h-12 shrink-0 items-center rounded-full border-2 border-ocean px-4 text-[16px] font-semibold whitespace-nowrap text-ocean",
  "transition-colors hover:bg-ground-deep active:bg-ocean-pressed active:text-white",
  "data-[state=on]:bg-ocean data-[state=on]:text-white data-[state=on]:hover:bg-ocean-hover",
);

export function ListControls({
  categories,
  query,
  onQueryChange,
  categoryId,
  onCategoryChange,
  neededOnly,
  onNeededOnlyChange,
}: ListControlsProps) {
  return (
    <form role="search" onSubmit={(event) => event.preventDefault()} className="grid gap-3">
      <div className="relative">
        <label htmlFor="list-search" className="sr-only">
          Search the list
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ocean"
        />
        <input
          id="list-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search the list"
          autoComplete="off"
          className="h-12 w-full rounded-xl border-2 border-ocean bg-white pr-4 pl-12 text-[18px] text-ink"
        />
      </div>

      <ToggleGroup.Root
        type="single"
        value={categoryId}
        onValueChange={(value) => {
          if (value) onCategoryChange(value);
        }}
        aria-label="Category"
        className="scrollbar-thin-ocean -mx-5 flex gap-2 overflow-x-auto px-5 pb-2"
      >
        <ToggleGroup.Item value="all" className={chipClass}>
          All
        </ToggleGroup.Item>
        {categories.map((category) => (
          <ToggleGroup.Item key={category.id} value={String(category.id)} className={chipClass}>
            {category.name}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>

      <div className="flex min-h-12 items-center gap-3">
        <Switch.Root
          id="needed-only"
          checked={neededOnly}
          onCheckedChange={onNeededOnlyChange}
          className="relative h-8 w-14 shrink-0 rounded-full border-2 border-ocean bg-white transition-colors data-[state=checked]:bg-ocean"
        >
          <Switch.Thumb className="block size-5 translate-x-1 rounded-full bg-ocean transition-transform data-[state=checked]:translate-x-7 data-[state=checked]:bg-white" />
        </Switch.Root>
        <label htmlFor="needed-only" className="py-3 text-[18px] font-semibold text-ocean">
          Still needed only
        </label>
      </div>
    </form>
  );
}
