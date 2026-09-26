import { validateVocationPath, type VocationPath } from "./character";
import { type CharacterType } from "./characterType";
import {
  getLevelRangeById,
  isVocationAvailable,
  type LevelRangeId,
} from "./levelRanges";
import { type VocationId } from "./vocations";

export function addToPath(
  path: VocationPath,
  rangeId: LevelRangeId,
  vocationId: VocationId,
  count: number,
  characterType: CharacterType,
): VocationPath {
  validateVocationPath(path, characterType);
  const { from, to } = getLevelRangeById(rangeId);
  const steps = path[rangeId];
  const available = to - from + 1 - steps.length;
  if (
    !Number.isInteger(count) ||
    count <= 0 ||
    !isVocationAvailable(rangeId, vocationId, characterType) ||
    available <= 0
  )
    return path;
  const added = Math.min(count, available);
  return {
    ...path,
    [rangeId]: [...steps, ...Array<VocationId>(added).fill(vocationId)],
  };
}

export function removeFromPath(
  path: VocationPath,
  rangeId: LevelRangeId,
  vocationId: VocationId,
): VocationPath {
  const index = path[rangeId].indexOf(vocationId);
  if (index < 0) return path;
  const steps = [...path[rangeId]];
  steps.splice(index, 1);
  return { ...path, [rangeId]: steps };
}

export function removeAllFromPath(
  path: VocationPath,
  rangeId: LevelRangeId,
  vocationId: VocationId,
): VocationPath {
  const steps = path[rangeId];
  if (!steps.includes(vocationId)) return path;
  return {
    ...path,
    [rangeId]: steps.filter((step) => step !== vocationId),
  };
}

export function replaceInPath(
  path: VocationPath,
  rangeId: LevelRangeId,
  sourceId: VocationId,
  targetId: VocationId,
  characterType: CharacterType,
): VocationPath {
  validateVocationPath(path, characterType);
  const index = path[rangeId].indexOf(sourceId);
  if (
    sourceId === targetId ||
    index < 0 ||
    !isVocationAvailable(rangeId, targetId, characterType)
  )
    return path;
  const steps = [...path[rangeId]];
  steps[index] = targetId;
  return { ...path, [rangeId]: steps };
}
