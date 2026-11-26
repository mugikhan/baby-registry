import { useState } from "react";
import { deleteAdminItem, setAdminItemStatus } from "@/lib/admin-api";
import type { AdminItem } from "@/lib/admin-items";

const outlineButton =
  "min-h-12 shrink-0 rounded-xl border-2 border-ocean px-4 text-[18px] font-bold text-ocean disabled:opacity-60";

type Step = { kind: "idle" } | { kind: "confirm" } | { kind: "reserved"; message: string };

interface ItemActionsProps {
  item: AdminItem;
  onChanged: () => Promise<void>;
  onDeleted: () => Promise<void>;
}

export function ItemActions({ item, onChanged, onDeleted }: ItemActionsProps) {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const archived = item.status === "archived";

  async function setStatus(status: "draft" | "archived") {
    setBusy(true);
    try {
      await setAdminItemStatus(item.id, status);
      setStep({ kind: "idle" });
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const result = await deleteAdminItem(item.id);
      if (result.ok) return await onDeleted();
      setStep({ kind: "reserved", message: result.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex basis-full flex-wrap items-center gap-3">
      {archived ? (
        <>
          <button
            type="button"
            disabled={busy}
            aria-label={`Unarchive ${item.title}`}
            onClick={() => setStatus("draft")}
            className={outlineButton}
          >
            Unarchive
          </button>
          <span className="text-[16px] text-ocean-muted">Unarchive returns the item to draft.</span>
        </>
      ) : (
        <button
          type="button"
          disabled={busy}
          aria-label={`Archive ${item.title}`}
          onClick={() => setStatus("archived")}
          className={outlineButton}
        >
          Archive
        </button>
      )}
      {step.kind === "idle" ? (
        <button
          type="button"
          aria-label={`Delete ${item.title}`}
          onClick={() => setStep({ kind: "confirm" })}
          className="min-h-12 shrink-0 rounded-xl border-2 border-airmail-deep px-4 text-[18px] font-bold text-airmail-deep"
        >
          Delete
        </button>
      ) : null}
      {step.kind === "confirm" ? (
        <div
          role="group"
          aria-label={`Confirm delete ${item.title}`}
          className="flex flex-wrap items-center gap-3"
        >
          <span className="text-[18px] font-semibold text-ink">Delete this item for good?</span>
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="min-h-12 rounded-xl bg-airmail-deep px-4 text-[18px] font-bold text-white disabled:opacity-60"
          >
            Yes, delete
          </button>
          <button type="button" onClick={() => setStep({ kind: "idle" })} className={outlineButton}>
            Keep
          </button>
        </div>
      ) : null}
      {step.kind === "reserved" ? (
        <div role="alert" className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-airmail-deep">{step.message}</span>
          {archived ? null : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setStatus("archived")}
              className={outlineButton}
            >
              Archive instead
            </button>
          )}
          <button type="button" onClick={() => setStep({ kind: "idle" })} className={outlineButton}>
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}
