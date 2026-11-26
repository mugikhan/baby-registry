import { AirmailEdge } from "@/components/AirmailEdge";

function Bar({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-sand-deep motion-reduce:animate-none ${className}`}
    />
  );
}

function CardShape() {
  return (
    <li className="rounded-[10px] bg-sand p-4 shadow-[0_1px_2px_rgb(15_76_110/0.25)]">
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3.5">
          <div className="size-[72px] shrink-0 animate-pulse rounded-lg bg-sand-pale motion-reduce:animate-none" />
          <div className="min-w-0 flex-1 space-y-2.5 pt-1">
            <Bar className="h-5 w-3/5" />
            <Bar className="h-4 w-full" />
            <Bar className="h-4 w-2/5" />
          </div>
        </div>
        <Bar className="h-12 w-full rounded-xl" />
      </div>
    </li>
  );
}

/** Stands in for the list in the server HTML and while the first fetch runs. */
export function ListSkeleton() {
  return (
    <>
      <AirmailEdge />
      <div aria-busy="true" className="mx-auto max-w-[1120px] px-5 pb-12">
        <p role="status" className="sr-only">
          Loading the list
        </p>
        <div aria-hidden="true">
          <div className="flex items-start justify-between gap-4 pt-6 pb-4">
            <div className="min-w-0 flex-1 space-y-3">
              <Bar className="h-9 w-3/4 max-w-sm" />
              <Bar className="h-4 w-1/2 max-w-xs" />
            </div>
            <Bar className="h-12 w-28 shrink-0 rounded-full" />
          </div>
          <div className="-mx-5 flex gap-2 overflow-hidden px-5 pb-2">
            {[0, 1, 2, 3].map((n) => (
              <Bar key={n} className="h-12 w-24 shrink-0 rounded-full" />
            ))}
          </div>
          <ul className="mt-5 grid items-start grid-cols-1 gap-3.5 min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3">
            {[0, 1, 2, 3].map((n) => (
              <CardShape key={n} />
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
