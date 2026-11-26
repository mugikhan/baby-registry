export function isSameIdSet(expected: number[], actual: number[]): boolean {
  return (
    expected.length === actual.length &&
    new Set(actual).size === actual.length &&
    expected.every((id) => actual.includes(id))
  );
}

/** Returns a new array. An out-of-range target leaves the order as it was. */
export function moveId(ids: number[], from: number, to: number): number[] {
  if (from === to || from < 0 || to < 0 || from >= ids.length || to >= ids.length) return ids;
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return ids;
  next.splice(to, 0, moved);
  return next;
}
