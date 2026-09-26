import {
  calculateStatus,
  validateCharacterInfo,
  type CharacterInfo,
  type VocationPath,
} from "./character";
import { getStatusGrowth } from "./growth";
import { assertCharacterType, type CharacterType } from "./characterType";
import { getAvailableVocations, LEVEL_RANGES } from "./levelRanges";
import {
  getWeightStatusBonus,
  scoreStatus,
  STAT_IDS,
  type Status,
} from "./status";
import { type VocationId } from "./vocations";

export type RoundingMultiple = 5 | 10;
export type RoundingEligibility =
  | { readonly kind: "ready" }
  | { readonly kind: "incomplete"; readonly unfilledCount: number }
  | {
      readonly kind: "impossible";
      readonly reason: "pawn-mage-parity";
      readonly mageCount: number;
    };

export type RoundingSearchResult =
  | Exclude<RoundingEligibility, { kind: "ready" }>
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

type AdjustmentRange = "forLv100" | "forLv200";

function assertMultiple(multiple: RoundingMultiple) {
  if (multiple !== 5 && multiple !== 10) {
    throw new RangeError("倍数は 5 または 10 を指定してください。");
  }
}

export function getRoundingChangeLimits(
  characterType: CharacterType,
  multiple: RoundingMultiple,
): Readonly<Record<AdjustmentRange, number>> {
  assertCharacterType(characterType);
  assertMultiple(multiple);
  if (characterType === "arisen") return { forLv100: 14, forLv200: 12 };
  return multiple === 5
    ? { forLv100: 6, forLv200: 6 }
    : { forLv100: 9, forLv200: 14 };
}

/** Shared preflight for the solver and the future pawn UI. */
export function getRoundingEligibility(
  character: CharacterInfo,
  multiple: RoundingMultiple,
): RoundingEligibility {
  assertMultiple(multiple);
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
  if (validated.characterType === "pawn" && multiple === 10) {
    const mageCount = validated.vocationPath.forLv10.filter(
      (id) => id === "mage",
    ).length;
    if (mageCount % 2 === 0)
      return { kind: "impossible", reason: "pawn-mage-parity", mageCount };
  }
  return { kind: "ready" };
}

type Move = {
  target: VocationId;
  changed: number;
  loss: number;
  scoreDelta: number;
  next: Uint16Array;
};

function mod(value: number, base: number): number {
  return ((value % base) + base) % base;
}

/** Mixed-radix residues: 500 prefix / 2,000 suffix states for mod 10. */
function residueSpace(range: AdjustmentRange, multiple: RoundingMultiple) {
  const bases =
    range === "forLv100"
      ? [multiple, 5, multiple]
      : [multiple === 10 ? 2 : 1, multiple, multiple, multiple];
  const encode = (values: readonly number[]) =>
    values.reduce(
      (key, value, index) => key * bases[index] + mod(value, bases[index]),
      0,
    );
  const signature = (s: Status) =>
    range === "forLv100"
      ? [s.hp - s.st, s.st, s.atk + s.matk + s.def + s.mdef]
      : [s.hp / 5, s.atk, s.matk, s.def];
  const size = bases.reduce((product, base) => product * base, 1);
  const coordinates = Array.from({ length: size }, (_, key) => {
    const values = Array<number>(bases.length);
    for (let i = bases.length - 1; i >= 0; i--) {
      values[i] = key % bases[i];
      key = Math.floor(key / bases[i]);
    }
    return values;
  });
  return { size, encode, signature, coordinates };
}

// Per-stat theoretical maxima put HP/ST and the other stats on comparable scales.
function statusMaxima(character: CharacterInfo): Status {
  const bonus = getWeightStatusBonus(character.weightClass);
  return Object.fromEntries(
    STAT_IDS.map((id) => [
      id,
      bonus[id] +
        LEVEL_RANGES.reduce(
          (total, range) =>
            total +
            (range.to - range.from + 1) *
              Math.max(
                ...getAvailableVocations(range.id, character.characterType).map(
                  (vocation) => getStatusGrowth(vocation, range.id).status[id],
                ),
              ),
          0,
        ),
    ]),
  ) as Status;
}

/**
 * Exact DP for an additive loss objective at a given change penalty. Each layer
 * consumes one original level, so no source vocation can be overdrawn.
 * Increasing the penalty limits edits; the final pass minimizes edit count
 * lexicographically and therefore guarantees the proven per-type bounds.
 * This is not a global optimum for final-stat loss across both stages.
 */
function adjustRange(
  steps: readonly VocationId[],
  status: Status,
  before: Status,
  maxima: Status,
  range: AdjustmentRange,
  multiple: RoundingMultiple,
  characterType: CharacterType,
  maxChanges: number,
): { steps: readonly VocationId[]; expanded: number } {
  const space = residueSpace(range, multiple);
  const initial = space.encode(space.signature(status));
  if (initial === 0) return { steps, expanded: 0 };
  const movesBySource = new Map<VocationId, Move[]>();
  for (const source of new Set(steps)) {
    const original = getStatusGrowth(source, range).status;
    movesBySource.set(
      source,
      getAvailableVocations(range, characterType)
        .filter(
          (target) =>
            range !== "forLv100" || target !== "mage" || target === source,
        )
        .map((target) => {
          const growth = getStatusGrowth(target, range).status;
          const delta = Object.fromEntries(
            STAT_IDS.map((id) => [id, growth[id] - original[id]]),
          ) as Status;
          // Relative loss weighted by squared proximity to the individual maximum:
          // (-delta / before) * (before / max)^2 = -delta * before / max^2.
          const loss =
            STAT_IDS.reduce(
              (sum, id) =>
                sum + (Math.max(0, -delta[id]) * before[id]) / maxima[id] ** 2,
              0,
            ) +
            (0.25 * Math.max(0, -scoreStatus(delta))) / scoreStatus(before);
          const signature = space.signature(delta);
          return {
            target,
            changed: Number(target !== source),
            loss,
            scoreDelta: scoreStatus(delta),
            next: Uint16Array.from(space.coordinates, (values) =>
              space.encode(values.map((value, i) => value + signature[i])),
            ),
          };
        }),
    );
  }

  let expanded = 0;
  for (const penalty of [0.0002, 0.002, Infinity]) {
    let costs = new Float64Array(space.size).fill(Infinity);
    let counts = new Uint8Array(space.size);
    let scores = new Float64Array(space.size);
    costs[initial] = 0;
    const parents = new Int16Array(steps.length * space.size).fill(-1);
    const choices = new Uint8Array(steps.length * space.size);
    for (const [level, source] of steps.entries()) {
      const nextCosts = new Float64Array(space.size).fill(Infinity);
      const nextCounts = new Uint8Array(space.size);
      const nextScores = new Float64Array(space.size);
      const moves = movesBySource.get(source)!;
      for (let state = 0; state < space.size; state++) {
        if (!Number.isFinite(costs[state])) continue;
        for (let choice = 0; choice < moves.length; choice++) {
          const move = moves[choice];
          expanded++;
          const next = move.next[state];
          const count = counts[state] + move.changed;
          const cost =
            costs[state] +
            move.loss +
            (penalty === Infinity ? 0 : penalty * move.changed);
          const score = scores[state] + move.scoreDelta;
          const unvisited = !Number.isFinite(nextCosts[next]);
          const primary =
            penalty === Infinity
              ? count - nextCounts[next]
              : cost - nextCosts[next];
          const secondary =
            penalty === Infinity
              ? cost - nextCosts[next]
              : count - nextCounts[next];
          if (
            unvisited ||
            primary < 0 ||
            (primary === 0 &&
              (secondary < 0 || (secondary === 0 && score > nextScores[next])))
          ) {
            nextCosts[next] = cost;
            nextCounts[next] = count;
            nextScores[next] = score;
            const index = level * space.size + next;
            parents[index] = state;
            choices[index] = choice;
          }
        }
      }
      costs = nextCosts;
      counts = nextCounts;
      scores = nextScores;
    }
    if (!Number.isFinite(costs[0]) || counts[0] > maxChanges) continue;
    const result = [...steps];
    let state = 0;
    for (let level = steps.length - 1; level >= 0; level--) {
      const index = level * space.size + state;
      result[level] = movesBySource.get(steps[level])![choices[index]].target;
      state = parents[index];
    }
    return { steps: result, expanded };
  }
  throw new Error("成長表が倍数調整の到達条件を満たしていません。");
}

export function searchRoundingAdjustment(
  character: CharacterInfo,
  multiple: RoundingMultiple,
): RoundingSearchResult {
  const eligibility = getRoundingEligibility(character, multiple);
  if (eligibility.kind !== "ready") return eligibility;
  const validated = validateCharacterInfo(character);
  const limits = getRoundingChangeLimits(validated.characterType, multiple);
  const beforeStatus = calculateStatus(validated);
  let path = validated.vocationPath;
  let afterStatus = beforeStatus;
  let expandedCount = 0;
  if (!STAT_IDS.every((id) => beforeStatus[id] % multiple === 0)) {
    const maxima = statusMaxima(validated);
    for (const range of ["forLv100", "forLv200"] as const) {
      const adjusted = adjustRange(
        path[range],
        afterStatus,
        beforeStatus,
        maxima,
        range,
        multiple,
        validated.characterType,
        limits[range],
      );
      path = { ...path, [range]: adjusted.steps };
      expandedCount += adjusted.expanded;
      afterStatus = calculateStatus({ ...validated, vocationPath: path });
    }
  }
  if (!STAT_IDS.every((id) => afterStatus[id] % multiple === 0)) {
    throw new Error("探索結果のステータスが倍数条件と一致しません。");
  }
  let changedCount = 0;
  for (const { id } of LEVEL_RANGES) {
    const changed = path[id].filter(
      (vocation, index) => vocation !== validated.vocationPath[id][index],
    ).length;
    const limit = id === "forLv100" || id === "forLv200" ? limits[id] : 0;
    if (changed > limit)
      throw new Error("探索結果の変更数が上限を超えています。");
    changedCount += changed;
  }
  return {
    kind: "found",
    path,
    changedCount,
    beforeStatus,
    afterStatus,
    beforeScore: scoreStatus(beforeStatus),
    afterScore: scoreStatus(afterStatus),
    expandedCount,
    truncated: false,
  };
}
