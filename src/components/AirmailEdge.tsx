export function AirmailEdge({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`h-3 w-full bg-[repeating-linear-gradient(135deg,var(--ocean)_0_14px,var(--edge-gap,var(--ground))_14px_22px,var(--airmail)_22px_36px,var(--edge-gap,var(--ground))_36px_44px)] ${className}`}
    />
  );
}
