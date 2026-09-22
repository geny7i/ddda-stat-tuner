export const STAT_IDS = ["hp", "st", "atk", "matk", "def", "mdef"] as const;
export type StatId = (typeof STAT_IDS)[number];
export type Status = Readonly<Record<StatId, number>>;

export const WEIGHT_CLASSES = ["ss", "s", "m", "l", "ll"] as const;
export type WeightClass = (typeof WEIGHT_CLASSES)[number];

const weightBonusByClass: Readonly<Record<WeightClass, number>> = {
  ss: 0,
  s: 20,
  m: 40,
  l: 60,
  ll: 80,
};

export function isWeightClass(value: unknown): value is WeightClass {
  return (
    typeof value === "string" &&
    WEIGHT_CLASSES.some((weightClass) => weightClass === value)
  );
}

export function getWeightStatusBonus(weightClass: WeightClass): Status {
  if (!isWeightClass(weightClass)) {
    throw new RangeError(`不明な体格: ${String(weightClass)}`);
  }
  return {
    hp: 0,
    st: weightBonusByClass[weightClass],
    atk: 0,
    matk: 0,
    def: 0,
    mdef: 0,
  };
}

export function scoreStatus(
  status: Status,
  focusedStatIds: readonly StatId[] = STAT_IDS,
): number {
  return STAT_IDS.reduce(
    (score, statId) =>
      score +
      (focusedStatIds.includes(statId)
        ? statId === "hp" || statId === "st"
          ? status[statId] / 10
          : status[statId]
        : 0),
    0,
  );
}

export function addStatuses(left: Status, right: Status): Status {
  return {
    hp: left.hp + right.hp,
    st: left.st + right.st,
    atk: left.atk + right.atk,
    matk: left.matk + right.matk,
    def: left.def + right.def,
    mdef: left.mdef + right.mdef,
  };
}

export const ZERO_STATUS: Status = {
  hp: 0,
  st: 0,
  atk: 0,
  matk: 0,
  def: 0,
  mdef: 0,
};
