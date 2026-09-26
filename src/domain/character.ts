import { getStatusGrowth } from "./growth";
import { assertCharacterType, type CharacterType } from "./characterType";
import {
  LEVEL_RANGES,
  type LevelRangeId,
  isVocationAvailable,
} from "./levelRanges";
import {
  addStatuses,
  getWeightStatusBonus,
  isWeightClass,
  type Status,
  type WeightClass,
} from "./status";
import { isVocationId, type VocationId } from "./vocations";

export type VocationPath = Readonly<
  Record<LevelRangeId, readonly VocationId[]>
>;

export type CharacterInfo = {
  readonly characterType: CharacterType;
  readonly vocationPath: VocationPath;
  readonly weightClass: WeightClass;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateCharacterInfo(value: unknown): CharacterInfo {
  if (
    !isRecord(value) ||
    !isRecord(value.vocationPath) ||
    !isWeightClass(value.weightClass)
  ) {
    throw new TypeError("育成経路または体格の形式が正しくありません。");
  }

  assertCharacterType(value.characterType);
  return {
    characterType: value.characterType,
    weightClass: value.weightClass,
    vocationPath: validateVocationPath(value.vocationPath, value.characterType),
  };
}

export function validateVocationPath(
  value: unknown,
  characterType: CharacterType,
): VocationPath {
  assertCharacterType(characterType);
  if (!isRecord(value))
    throw new TypeError("育成経路の形式が正しくありません。");
  const path: Partial<Record<LevelRangeId, readonly VocationId[]>> = {};
  for (const range of LEVEL_RANGES) {
    const steps: unknown = value[range.id];
    if (!Array.isArray(steps) || steps.length > range.to - range.from + 1) {
      throw new RangeError(`${range.id} のレベル数が正しくありません。`);
    }
    if (
      !steps.every(isVocationId) ||
      !steps.every((id: VocationId) =>
        isVocationAvailable(range.id, id, characterType),
      )
    ) {
      throw new RangeError(`${range.id} に選択できない職業があります。`);
    }
    path[range.id] = [...steps];
  }

  return path as VocationPath;
}

export function calculateStatus(character: CharacterInfo): Status {
  const { vocationPath, weightClass } = validateCharacterInfo(character);
  let result = getWeightStatusBonus(weightClass);

  for (const range of LEVEL_RANGES) {
    for (const vocationId of vocationPath[range.id]) {
      result = addStatuses(
        result,
        getStatusGrowth(vocationId, range.id).status,
      );
    }
  }

  return result;
}
