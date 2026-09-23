import type { VocationId } from "./vocations";

/** Keep the order in which vocations first appear in the path. */
export function countVocations(
  steps: readonly VocationId[],
): ReadonlyMap<VocationId, number> {
  const counts = new Map<VocationId, number>();
  for (const vocation of steps) {
    counts.set(vocation, (counts.get(vocation) ?? 0) + 1);
  }
  return counts;
}
