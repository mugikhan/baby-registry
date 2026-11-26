import { cn } from "@/lib/utils";

export const chipClass = cn(
  "inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-ocean px-4 text-[16px] font-semibold whitespace-nowrap text-ocean",
  "transition-colors hover:bg-ground-deep active:bg-ocean-pressed active:text-white",
  "data-[state=on]:bg-ocean data-[state=on]:text-white data-[state=on]:hover:bg-ocean-hover",
);
