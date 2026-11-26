const moveButton =
  "inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border-2 border-ocean px-3 text-[18px] font-bold text-ocean disabled:opacity-40";

export function moveButtonId(direction: "up" | "down", id: number) {
  return `move-${direction}-${id}`;
}

export function MoveButtons({
  id,
  label,
  isFirst,
  isLast,
  onMove,
}: {
  id: number;
  label: string;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        id={moveButtonId("up", id)}
        disabled={isFirst}
        aria-label={`Move up ${label}`}
        onClick={() => onMove("up")}
        className={moveButton}
      >
        Move up
      </button>
      <button
        type="button"
        id={moveButtonId("down", id)}
        disabled={isLast}
        aria-label={`Move down ${label}`}
        onClick={() => onMove("down")}
        className={moveButton}
      >
        Move down
      </button>
    </div>
  );
}

export function focusMoved(id: number, direction: "up" | "down") {
  requestAnimationFrame(() => {
    const same = document.getElementById(moveButtonId(direction, id));
    const other = document.getElementById(moveButtonId(direction === "up" ? "down" : "up", id));
    if (same instanceof HTMLButtonElement && !same.disabled) same.focus();
    else if (other instanceof HTMLButtonElement) other.focus();
  });
}
