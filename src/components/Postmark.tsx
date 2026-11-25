type PostmarkProps = {
  names: string[];
  date?: string;
  animate?: boolean;
};

function shortName(names: string[]) {
  const first = (names[0] ?? "").split(" ").pop() ?? "";
  const clipped = first.length > 9 ? `${first.slice(0, 8)}.` : first;
  return names.length > 1 ? `${clipped} +${names.length - 1}` : clipped;
}

export function Postmark({ names, date, animate = false }: PostmarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      className={`${animate ? "postmark-stamp" : ""} pointer-events-none absolute top-11 right-3 size-[88px] -rotate-12 overflow-visible text-ocean`}
      fill="none"
      stroke="currentColor"
    >
      <circle cx="50" cy="50" r="46" strokeWidth="3" />
      <circle cx="50" cy="50" r="39" strokeWidth="1.5" />
      <g stroke="none" fill="currentColor" textAnchor="middle" fontWeight="800">
        <text x="50" y="42" fontSize="15" letterSpacing="1">
          TAKEN
        </text>
        <text x="50" y="58" fontSize="12">
          {shortName(names).toUpperCase()}
        </text>
        {date ? (
          <text x="50" y="72" fontSize="10.5">
            {date.toUpperCase()}
          </text>
        ) : null}
      </g>
      <g strokeWidth="2.5" strokeLinecap="round">
        <path d="M-12 34 q5 -6 10 0 t10 0 t10 0" />
        <path d="M-12 46 q5 -6 10 0 t10 0 t10 0" />
        <path d="M-12 58 q5 -6 10 0 t10 0 t10 0" />
      </g>
    </svg>
  );
}
