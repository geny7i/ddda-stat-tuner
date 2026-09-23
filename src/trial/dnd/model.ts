import {
  addToPath,
  removeFromPath,
  replaceInPath,
  type LevelRangeId,
  type VocationId,
  type VocationPath,
} from "../../domain";
import { parseSource, parseTarget } from "../../features/pathEditor/dragIds";

export {
  parseSource,
  parseTarget,
  rangeId,
  selectionId,
  stackId,
} from "../../features/pathEditor/dragIds";

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
  const path = addToPath(state.path, range, vocation, count);
  const added = path[range].length - state.path[range].length;
  return commit(
    state,
    path,
    added > 0
      ? `${range} に ${vocation} を ${added} 件追加しました。`
      : "このレベル帯には追加できません。",
  );
}

export function removeOne(
  state: TrialState,
  range: LevelRangeId,
  vocation: VocationId,
): TrialState {
  const path = removeFromPath(state.path, range, vocation);
  return commit(
    state,
    path,
    path === state.path
      ? "削除する職業がありません。"
      : `${range} から ${vocation} を 1 件削除しました。`,
  );
}

export function replaceOne(
  state: TrialState,
  range: LevelRangeId,
  source: VocationId,
  target: VocationId,
): TrialState {
  const path = replaceInPath(state.path, range, source, target);
  return commit(
    state,
    path,
    path === state.path
      ? "この職業には変更できません。"
      : `${range} の ${source} を ${target} に変更しました。`,
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
