import type { ReactNode } from "react";

const control =
  "mt-1 block min-h-12 w-full rounded-xl border-2 border-ocean bg-sand-pale px-3 text-[18px] text-ink outline-none focus-visible:ring-3 focus-visible:ring-ocean/40 aria-[invalid=true]:border-airmail";

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | undefined;
  hint?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby"?: string;
  }) => ReactNode;
}) {
  const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const messageId = `${id}-message`;
  const message = error ?? hint;
  return (
    <div>
      <label htmlFor={id} className="block text-[18px] font-bold text-ink">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": error !== undefined,
        ...(message ? { "aria-describedby": messageId } : {}),
      })}
      {message ? (
        <p
          id={messageId}
          className={`mt-1 text-[16px] ${error ? "font-semibold text-airmail-deep" : "text-ocean-muted"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput(props: React.ComponentProps<"input">) {
  return <input {...props} className={control} />;
}

export function TextArea(props: React.ComponentProps<"textarea">) {
  return <textarea {...props} className={`${control} min-h-28 py-2`} />;
}

export function SelectInput(props: React.ComponentProps<"select">) {
  return <select {...props} className={control} />;
}
