import { Gift } from "lucide-react";

type RegistryHeaderProps = {
  title: string;
  yoursCount: number;
};

export function RegistryHeader({ title, yoursCount }: RegistryHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 pt-6 pb-4">
      <div className="min-w-0">
        <h1 className="text-[34px] leading-[1.05] font-extrabold tracking-[-0.01em] text-balance text-ocean">
          {title}
        </h1>
        <p className="mt-2 text-[16px] text-ocean-muted">
          Baby Khan’s baby shower · <span className="whitespace-nowrap">30 Jan 2027</span>
        </p>
      </div>
      <p className="inline-flex shrink-0 min-h-12 items-center gap-2 rounded-full bg-airmail px-4 text-[16px] font-bold whitespace-nowrap text-white">
        <Gift aria-hidden="true" className="size-5" />
        <span>
          Your gifts · <span className="tabular-nums">{yoursCount}</span>
        </span>
      </p>
    </header>
  );
}
