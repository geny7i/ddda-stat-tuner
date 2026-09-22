import {
  getLevelRangeById,
  isVocationAvailable,
  LEVEL_RANGES,
  type LevelRangeId,
  type VocationId,
  type VocationPath,
  isVocationId,
} from "../../domain";

export type TrialState = {
  readonly path: VocationPath;
  readonly updates: number;
  readonly message: string;
};

export const initialTrialState: TrialState = {
  path: { onlyLv1: [], forLv10: [], forLv100: [], forLv200: [] },
  updates: 0,
  message: "操作を試してください。",
};

export type DragSource =
  | { kind: "selection"; vocationId: VocationId; count: number }
  | { kind: "stack"; rangeId: LevelRangeId; vocationId: VocationId };

export type DropTarget =
  | { kind: "range"; rangeId: LevelRangeId }
  | { kind: "stack"; rangeId: LevelRangeId; vocationId: VocationId };

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
  if (extra !== undefined || !isRangeId(first)) return null;
  if (kind === "range" && second === undefined) return { kind, rangeId: first };
  if (kind === "stack" && isVocationId(second)) {
    return { kind, rangeId: first, vocationId: second };
  }
  return null;
}

function commit(
  state: TrialState,
  path: VocationPath,
  message: string,
): TrialState {
  return path === state.path
    ? { ...state, message }
    : { path, message, updates: state.updates + 1 };
}

export function addSelection(
  state: TrialState,
  range: LevelRangeId,
  vocation: VocationId,
  count: number,
): TrialState {
  const { from, to } = getLevelRangeById(range);
  const steps = state.path[range];
  const available = to - from + 1 - steps.length;
  if (
    !Number.isInteger(count) ||
    count <= 0 ||
    !isVocationAvailable(range, vocation) ||
    available <= 0
  ) {
    return commit(state, state.path, "このレベル帯には追加できません。");
  }
  const added = Math.min(count, available);
  return commit(
    state,
    {
      ...state.path,
      [range]: [...steps, ...Array<VocationId>(added).fill(vocation)],
    },
    `${range} に ${vocation} を ${added} 件追加しました。`,
  );
}

export function removeOne(
  state: TrialState,
  range: LevelRangeId,
  vocation: VocationId,
): TrialState {
  const index = state.path[range].indexOf(vocation);
  if (index < 0) return commit(state, state.path, "削除する職業がありません。");
  const steps = [...state.path[range]];
  steps.splice(index, 1);
  return commit(
    state,
    { ...state.path, [range]: steps },
    `${range} から ${vocation} を 1 件削除しました。`,
  );
}

export function replaceOne(
  state: TrialState,
  range: LevelRangeId,
  source: VocationId,
  target: VocationId,
): TrialState {
  const index = state.path[range].indexOf(source);
  if (source === target || index < 0 || !isVocationAvailable(range, target)) {
    return commit(state, state.path, "この職業には変更できません。");
  }
  const steps = [...state.path[range]];
  steps[index] = target;
  return commit(
    state,
    { ...state.path, [range]: steps },
    `${range} の ${source} を ${target} に変更しました。`,
  );
}

export function applyDrop(
  state: TrialState,
  sourceId: string | number,
  targetId: string | number | null,
): TrialState {
  if (targetId === null) return state;
  const source = parseSource(sourceId);
  const target = parseTarget(targetId);
  if (source?.kind === "selection" && target?.kind === "range") {
    return addSelection(state, target.rangeId, source.vocationId, source.count);
  }
  if (
    source?.kind === "stack" &&
    target?.kind === "stack" &&
    source.rangeId === target.rangeId
  ) {
    return replaceOne(
      state,
      source.rangeId,
      source.vocationId,
      target.vocationId,
    );
  }
  return state;
}
