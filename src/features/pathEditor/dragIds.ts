import {
  isVocationId,
  LEVEL_RANGES,
  type LevelRangeId,
  type VocationId,
} from "../../domain";

export type DragSource =
  | { kind: "selection"; vocationId: VocationId; count: number }
  | { kind: "stack"; rangeId: LevelRangeId; vocationId: VocationId };

export type DropTarget =
  | { kind: "range"; rangeId: LevelRangeId }
  | { kind: "stack"; rangeId: LevelRangeId; vocationId: VocationId }
  | { kind: "vocation"; vocationId: VocationId };

const rangeIds = new Set<string>(LEVEL_RANGES.map(({ id }) => id));

function isRangeId(value: string): value is LevelRangeId {
  return rangeIds.has(value);
}

export function selectionId(vocationId: VocationId, count: number): string {
  return `selection:${vocationId}:${count}`;
}

export function stackId(rangeId: LevelRangeId, vocationId: VocationId): string {
  return `stack:${rangeId}:${vocationId}`;
}

export function rangeId(rangeId: LevelRangeId): string {
  return `range:${rangeId}`;
}

export function vocationTargetId(vocationId: VocationId): string {
  return `vocation:${vocationId}`;
}

export function parseSource(id: string | number): DragSource | null {
  const [kind, first, second, extra] = String(id).split(":");
  if (extra !== undefined) return null;
  if (kind === "selection" && isVocationId(first)) {
    const count = Number(second);
    return Number.isInteger(count) && [1, 10, 100].includes(count)
      ? { kind, vocationId: first, count }
      : null;
  }
  if (kind === "stack" && isRangeId(first) && isVocationId(second)) {
    return { kind, rangeId: first, vocationId: second };
  }
  return null;
}

export function parseTarget(id: string | number): DropTarget | null {
  const [kind, first, second, extra] = String(id).split(":");
  if (extra !== undefined) return null;
  if (kind === "vocation" && isVocationId(first) && second === undefined)
    return { kind, vocationId: first };
  if (!isRangeId(first)) return null;
  if (kind === "range" && second === undefined) return { kind, rangeId: first };
  if (kind === "stack" && isVocationId(second)) {
    return { kind, rangeId: first, vocationId: second };
  }
  return null;
}
