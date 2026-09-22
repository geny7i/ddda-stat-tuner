import { VOCATIONS, VOCATION_IDS, type VocationId } from "./vocations";

export const LEVEL_RANGE_IDS = {
  onlyLv1: "onlyLv1",
  forLv10: "forLv10",
  forLv100: "forLv100",
  forLv200: "forLv200",
} as const;

export type LevelRangeId =
  (typeof LEVEL_RANGE_IDS)[keyof typeof LEVEL_RANGE_IDS];

export type LevelRange = {
  readonly id: LevelRangeId;
  readonly from: number;
  readonly to: number;
  readonly availableVocationIds: readonly VocationId[];
};

const basicVocations: readonly VocationId[] = [
  VOCATION_IDS.fighter,
  VOCATION_IDS.strider,
  VOCATION_IDS.mage,
];

export const LEVEL_RANGES: readonly LevelRange[] = [
  {
    id: LEVEL_RANGE_IDS.onlyLv1,
    from: 1,
    to: 1,
    availableVocationIds: basicVocations,
  },
  {
    id: LEVEL_RANGE_IDS.forLv10,
    from: 2,
    to: 10,
    availableVocationIds: basicVocations,
  },
  {
    id: LEVEL_RANGE_IDS.forLv100,
    from: 11,
    to: 100,
    availableVocationIds: VOCATIONS,
  },
  {
    id: LEVEL_RANGE_IDS.forLv200,
    from: 101,
    to: 200,
    availableVocationIds: VOCATIONS,
  },
];

export function getLevelRangeById(id: LevelRangeId): LevelRange {
  const range = LEVEL_RANGES.find((candidate) => candidate.id === id);
  if (!range) throw new RangeError(`不明なレベル帯: ${String(id)}`);
  return range;
}

export function getLevelRangeForLevel(level: number): LevelRange {
  if (!Number.isInteger(level)) {
    throw new RangeError(`レベルは整数で指定してください: ${level}`);
  }

  const range = LEVEL_RANGES.find(
    ({ from, to }) => from <= level && level <= to,
  );
  if (!range)
    throw new RangeError(`レベルは 1～200 の範囲で指定してください: ${level}`);
  return range;
}

export function isVocationAvailable(
  rangeId: LevelRangeId,
  vocationId: VocationId,
): boolean {
  return getLevelRangeById(rangeId).availableVocationIds.includes(vocationId);
}
