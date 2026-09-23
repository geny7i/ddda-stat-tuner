import type { VocationPath } from "./character";
import { getStatusGrowth } from "./growth";
import { LEVEL_RANGES, type LevelRange } from "./levelRanges";
import type { StatId } from "./status";
import type { VocationId } from "./vocations";

export type PathAdjustmentStrategy = {
  readonly kind: "maximize-stat";
  readonly statId: StatId;
};

export type PathAdjustmentScope = { readonly kind: "unfilled" };

export type PathAdjustmentRequest = {
  readonly strategy: PathAdjustmentStrategy;
  readonly scope: PathAdjustmentScope;
};

export type PathAdjustmentResult = {
  readonly path: VocationPath;
  readonly changedCount: number;
};

export function selectVocationForStrategy(
  range: LevelRange,
  strategy: PathAdjustmentStrategy,
): VocationId {
  const [first, ...remaining] = range.availableVocationIds;
  if (!first)
    throw new RangeError(`${range.id} に選択可能な職業がありません。`);

  let bestId = first;
  let bestValue = getStatusGrowth(first, range.id).status[strategy.statId];
  for (const vocationId of remaining) {
    const value = getStatusGrowth(vocationId, range.id).status[strategy.statId];
    if (value > bestValue) {
      bestId = vocationId;
      bestValue = value;
    }
  }
  return bestId;
}

export function countUnfilledLevels(path: VocationPath): number {
  return LEVEL_RANGES.reduce(
    (total, { id, from, to }) =>
      total + Math.max(0, to - from + 1 - path[id].length),
    0,
  );
}

function fillUnfilledLevels(
  path: VocationPath,
  strategy: PathAdjustmentStrategy,
): PathAdjustmentResult {
  const nextPath: Record<keyof VocationPath, readonly VocationId[]> = {
    ...path,
  };
  let changedCount = 0;

  for (const range of LEVEL_RANGES) {
    const steps = path[range.id];
    const missing = range.to - range.from + 1 - steps.length;
    if (missing <= 0) continue;
    const vocationId = selectVocationForStrategy(range, strategy);
    nextPath[range.id] = [
      ...steps,
      ...Array<VocationId>(missing).fill(vocationId),
    ];
    changedCount += missing;
  }

  return { path: nextPath, changedCount };
}

export function adjustPath(
  path: VocationPath,
  request: PathAdjustmentRequest,
): PathAdjustmentResult {
  switch (request.scope.kind) {
    case "unfilled":
      return fillUnfilledLevels(path, request.strategy);
  }
}
