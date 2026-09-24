import {
  calculateStatus,
  validateCharacterInfo,
  type CharacterInfo,
  type VocationPath,
} from "./character";
import { getStatusGrowth } from "./growth";
import { LEVEL_RANGES, type LevelRangeId } from "./levelRanges";
import { scoreStatus, STAT_IDS, type Status } from "./status";
import { VOCATIONS, type VocationId } from "./vocations";

export type RoundingMultiple = 5 | 10;

export type RoundingSearchLimits = {
  readonly maxChanges?: number;
  readonly beamWidth?: number;
  readonly maxExpanded?: number;
};

export type RoundingSearchResult =
  | { readonly kind: "incomplete"; readonly unfilledCount: number }
  | {
      readonly kind: "not-found";
      readonly expandedCount: number;
      readonly truncated: boolean;
    }
  | {
      readonly kind: "found";
      readonly path: VocationPath;
      readonly changedCount: number;
      readonly beforeStatus: Status;
      readonly afterStatus: Status;
      readonly beforeScore: number;
      readonly afterScore: number;
      readonly expandedCount: number;
      readonly truncated: boolean;
    };

type Move = {
  rangeId: LevelRangeId;
  source: VocationId;
  target: VocationId;
  sourceIndex: number;
  delta: readonly number[];
  scoreDelta: number;
};

type SearchState = {
  moves: readonly number[];
  used: Uint8Array;
  status: readonly number[];
  score: number;
  distance: number;
  residueKey: string;
};

const DEFAULT_MAX_CHANGES = 10;
const DEFAULT_BEAM_WIDTH = 600;
const DEFAULT_MAX_EXPANDED = 1_000_000;
const VOCATION_COUNT = VOCATIONS.length;

function statusValues(status: Status): number[] {
  return STAT_IDS.map((id) => status[id]);
}

function scoreUnits(values: readonly number[]): number {
  return (
    values[0] +
    values[1] +
    10 * values.slice(2).reduce((sum, value) => sum + value, 0)
  );
}

function isDivisible(
  values: readonly number[],
  multiple: RoundingMultiple,
): boolean {
  return values.every((value) => value % multiple === 0);
}

function residueInfo(values: readonly number[], multiple: RoundingMultiple) {
  const residues = values.map(
    (value) => ((value % multiple) + multiple) % multiple,
  );
  return {
    key: residues.join(","),
    distance: residues.reduce(
      (sum, residue) => sum + Math.min(residue, multiple - residue),
      0,
    ),
  };
}

function compareMoves(
  left: readonly number[],
  right: readonly number[],
): number {
  for (let index = 0; index < Math.min(left.length, right.length); index++) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

function compareBeamStates(left: SearchState, right: SearchState): number {
  return (
    left.distance - right.distance ||
    right.score - left.score ||
    compareMoves(left.moves, right.moves)
  );
}

function isBetterSolution(
  candidate: SearchState,
  current: SearchState | undefined,
): boolean {
  if (!current) return true;
  return (
    candidate.score > current.score ||
    (candidate.score === current.score &&
      (candidate.moves.length < current.moves.length ||
        (candidate.moves.length === current.moves.length &&
          compareMoves(candidate.moves, current.moves) < 0)))
  );
}

function createMoves(path: VocationPath): {
  moves: Move[];
  available: Uint8Array;
} {
  const moves: Move[] = [];
  const available = new Uint8Array(LEVEL_RANGES.length * VOCATION_COUNT);

  for (const [rangeIndex, range] of LEVEL_RANGES.entries()) {
    for (const id of path[range.id]) {
      available[rangeIndex * VOCATION_COUNT + VOCATIONS.indexOf(id)]++;
    }
    for (const source of range.availableVocationIds) {
      const sourceIndex =
        rangeIndex * VOCATION_COUNT + VOCATIONS.indexOf(source);
      if (available[sourceIndex] === 0) continue;
      const sourceGrowth = getStatusGrowth(source, range.id).status;
      for (const target of range.availableVocationIds) {
        if (target === source) continue;
        const targetGrowth = getStatusGrowth(target, range.id).status;
        const delta = STAT_IDS.map(
          (statId) => targetGrowth[statId] - sourceGrowth[statId],
        );
        moves.push({
          rangeId: range.id,
          source,
          target,
          sourceIndex,
          delta,
          scoreDelta: scoreUnits(delta),
        });
      }
    }
  }
  return { moves, available };
}

function applyMoves(
  path: VocationPath,
  selected: readonly number[],
  moves: readonly Move[],
): VocationPath {
  const replacements = new Map<LevelRangeId, Map<VocationId, VocationId[]>>();
  for (const index of selected) {
    const { rangeId, source, target } = moves[index];
    let bySource = replacements.get(rangeId);
    if (!bySource) {
      bySource = new Map();
      replacements.set(rangeId, bySource);
    }
    const targets = bySource.get(source) ?? [];
    targets.push(target);
    bySource.set(source, targets);
  }

  const next: Record<LevelRangeId, readonly VocationId[]> = { ...path };
  for (const [rangeId, bySource] of replacements) {
    const cursors = new Map<VocationId, number>();
    next[rangeId] = path[rangeId].map((source) => {
      const targets = bySource.get(source);
      if (!targets) return source;
      const cursor = cursors.get(source) ?? 0;
      if (cursor >= targets.length) return source;
      cursors.set(source, cursor + 1);
      return targets[cursor];
    });
  }
  return next;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} は正の整数で指定してください。`);
  }
  return value;
}

/** Finds the best candidate seen within bounded search; it does not prove optimality. */
export function searchRoundingAdjustment(
  character: CharacterInfo,
  multiple: RoundingMultiple,
  limits: RoundingSearchLimits = {},
): RoundingSearchResult {
  if (multiple !== 5 && multiple !== 10) {
    throw new RangeError("倍数は 5 または 10 を指定してください。");
  }
  const maxChanges = positiveInteger(
    limits.maxChanges ?? DEFAULT_MAX_CHANGES,
    "maxChanges",
  );
  if (maxChanges > DEFAULT_MAX_CHANGES) {
    throw new RangeError("変更できるのは最大 10Lv です。");
  }
  const beamWidth = positiveInteger(
    limits.beamWidth ?? DEFAULT_BEAM_WIDTH,
    "beamWidth",
  );
  const maxExpanded = positiveInteger(
    limits.maxExpanded ?? DEFAULT_MAX_EXPANDED,
    "maxExpanded",
  );
  const validated = validateCharacterInfo(character);
  const unfilledCount = LEVEL_RANGES.reduce(
    (total, range) =>
      total +
      range.to -
      range.from +
      1 -
      validated.vocationPath[range.id].length,
    0,
  );
  if (unfilledCount > 0) return { kind: "incomplete", unfilledCount };

  const beforeStatus = calculateStatus(validated);
  const initialValues = statusValues(beforeStatus);
  const initialResidue = residueInfo(initialValues, multiple);
  const initial: SearchState = {
    moves: [],
    used: new Uint8Array(LEVEL_RANGES.length * VOCATION_COUNT),
    status: initialValues,
    score: scoreUnits(initialValues),
    distance: initialResidue.distance,
    residueKey: initialResidue.key,
  };
  const { moves, available } = createMoves(validated.vocationPath);
  let best: SearchState | undefined = isDivisible(initialValues, multiple)
    ? initial
    : undefined;
  let beam = [initial];
  let expandedCount = 0;
  let truncated = false;

  for (let depth = 1; depth <= maxChanges && beam.length > 0; depth++) {
    const byResidue = new Map<string, SearchState[]>();
    for (const state of beam) {
      const startIndex = state.moves.at(-1) ?? 0;
      for (let moveIndex = startIndex; moveIndex < moves.length; moveIndex++) {
        const move = moves[moveIndex];
        if (state.used[move.sourceIndex] >= available[move.sourceIndex])
          continue;
        if (expandedCount >= maxExpanded) {
          truncated = true;
          break;
        }
        expandedCount++;
        const values = state.status.map(
          (value, index) => value + move.delta[index],
        );
        const residue = residueInfo(values, multiple);
        const used = state.used.slice();
        used[move.sourceIndex]++;
        const candidate: SearchState = {
          moves: [...state.moves, moveIndex],
          used,
          status: values,
          score: state.score + move.scoreDelta,
          distance: residue.distance,
          residueKey: residue.key,
        };
        if (candidate.distance === 0 && isBetterSolution(candidate, best))
          best = candidate;
        if (depth === maxChanges) continue;

        const sameResidue = byResidue.get(candidate.residueKey) ?? [];
        sameResidue.push(candidate);
        sameResidue.sort(compareBeamStates);
        if (sameResidue.length > 2) sameResidue.pop();
        byResidue.set(candidate.residueKey, sameResidue);
      }
      if (truncated) break;
    }
    if (truncated || depth === maxChanges) break;
    beam = [...byResidue.values()]
      .flat()
      .sort(compareBeamStates)
      .slice(0, beamWidth);
  }

  if (!best) return { kind: "not-found", expandedCount, truncated };
  const path = applyMoves(validated.vocationPath, best.moves, moves);
  const afterStatus = calculateStatus({ ...validated, vocationPath: path });
  if (!isDivisible(statusValues(afterStatus), multiple)) {
    throw new Error("探索結果のステータスが倍数条件と一致しません。");
  }
  return {
    kind: "found",
    path,
    changedCount: best.moves.length,
    beforeStatus,
    afterStatus,
    beforeScore: scoreStatus(beforeStatus),
    afterScore: scoreStatus(afterStatus),
    expandedCount,
    truncated,
  };
}
