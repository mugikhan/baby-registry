import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import type { GuestListFilters } from "@/lib/list-filters";
import type { GuestListCategory } from "@/server/guest-list";
import { cn } from "@/lib/utils";

type ListControlsProps = {
  categories: GuestListCategory[];
  filters: GuestListFilters;
};

const SEARCH_DEBOUNCE_MS = 300;

const chipClass = cn(
  "inline-flex min-h-12 shrink-0 items-center rounded-full border-2 border-ocean px-4 text-[16px] font-semibold whitespace-nowrap text-ocean",
  "transition-colors hover:bg-ground-deep active:bg-ocean-pressed active:text-white",
  "data-[state=on]:bg-ocean data-[state=on]:text-white data-[state=on]:hover:bg-ocean-hover",
);

function Chip({
  category,
  active,
  children,
}: {
  category: number | undefined;
  active: boolean;
  children: string;
}) {
  return (
    <Link
      to="/"
      search={(prev) => ({ ...prev, category })}
      activeOptions={{ exact: true }}
      data-state={active ? "on" : "off"}
      className={chipClass}
    >
      {children}
    </Link>
  );
}

function SearchBox({ filters }: { filters: GuestListFilters }) {
  const navigate = useNavigate({ from: "/" });
  const urlQuery = filters.q ?? "";
  const [value, setValue] = useState(urlQuery);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastSent = useRef(urlQuery);

  // Follow the URL only when something else changed it, such as back or "Show everything".
  useEffect(() => {
    if (urlQuery === lastSent.current) return;
    lastSent.current = urlQuery;
    setValue(urlQuery);
  }, [urlQuery]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function send(next: string) {
    clearTimeout(timer.current);
    lastSent.current = next.trim();
    void navigate({
      to: "/",
      search: (prev) => ({ ...prev, q: next.trim() || undefined }),
      replace: true,
    });
  }

  return (
    <form
      method="get"
      action="/"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        send(value);
      }}
      className="relative"
    >
      {filters.category !== undefined && (
        <input type="hidden" name="category" value={filters.category} />
      )}
      {filters.needed && <input type="hidden" name="needed" value="true" />}
      <label htmlFor="list-search" className="sr-only">
        Search the list
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ocean"
      />
      <input
        id="list-search"
        name="q"
        type="search"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => send(next), SEARCH_DEBOUNCE_MS);
        }}
        placeholder="Search the list"
        autoComplete="off"
        className="h-12 w-full rounded-xl border-2 border-ocean bg-white pr-4 pl-12 text-[18px] text-ink"
      />
      <button type="submit" className="sr-only">
        Search
      </button>
    </form>
  );
}

export function ListControls({ categories, filters }: ListControlsProps) {
  const needed = filters.needed === true;

  return (
    <div className="grid gap-3">
      <SearchBox filters={filters} />

      <nav
        aria-label="Category"
        className="scrollbar-thin-ocean -mx-5 flex gap-2 overflow-x-auto px-5 pb-2"
      >
        <Chip category={undefined} active={filters.category === undefined}>
          All
        </Chip>
        {categories.map((category) => (
          <Chip key={category.id} category={category.id} active={filters.category === category.id}>
            {category.name}
          </Chip>
        ))}
      </nav>

      <Link
        to="/"
        search={(prev) => ({ ...prev, needed: needed ? undefined : true })}
        activeOptions={{ exact: true }}
        role="switch"
        aria-checked={needed}
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
