import { validateCharacterInfo, type CharacterInfo } from "./character";
import { getLevelRangeById, type LevelRangeId } from "./levelRanges";
import { isWeightClass } from "./status";
import { VOCATION_IDS, type VocationId } from "./vocations";

const VERSION = "1";

const vocationCodes: Readonly<Record<VocationId, string>> = {
  [VOCATION_IDS.fighter]: "z",
  [VOCATION_IDS.strider]: "y",
  [VOCATION_IDS.mage]: "x",
  [VOCATION_IDS.warrior]: "w",
  [VOCATION_IDS.ranger]: "v",
  [VOCATION_IDS.sorcerer]: "u",
  [VOCATION_IDS.assassin]: "t",
  [VOCATION_IDS.magick_archer]: "s",
  [VOCATION_IDS.mystic_knight]: "r",
};

const vocationByCode = new Map(
  Object.entries(vocationCodes).map(([vocationId, code]) => [
    code,
    vocationId as VocationId,
  ]),
);

export class RestoreCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RestoreCodeError";
  }
}

function encodePath(path: readonly VocationId[]): string {
  let result = "";
  for (let index = 0; index < path.length;) {
    const vocation = path[index];
    let count = 1;
    while (path[index + count] === vocation) count += 1;
    result += vocationCodes[vocation];
    if (count > 1) result += count.toString(16);
    index += count;
  }
  return result;
}

function decodePath(code: string, rangeId: LevelRangeId): VocationId[] {
  const { from, to, availableVocationIds } = getLevelRangeById(rangeId);
  const limit = to - from + 1;
  const result: VocationId[] = [];
  let index = 0;

  while (index < code.length) {
    const vocation = vocationByCode.get(code[index]);
    if (!vocation)
      throw new RestoreCodeError(`${rangeId} に不明な職業コードがあります。`);
    index += 1;
    const countStart = index;
    while (index < code.length && /[0-9a-f]/.test(code[index])) index += 1;
    const countCode = code.slice(countStart, index);
    const count = countCode === "" ? 1 : Number.parseInt(countCode, 16);
    if (
      !Number.isSafeInteger(count) ||
      count < 1 ||
      (countCode !== "" && countCode.startsWith("0"))
    ) {
      throw new RestoreCodeError(`${rangeId} の件数が正しくありません。`);
    }
    if (!availableVocationIds.includes(vocation)) {
      throw new RestoreCodeError(`${rangeId} に選択できない職業があります。`);
    }
    if (result.length + count > limit) {
      throw new RestoreCodeError(`${rangeId} が上限を超えています。`);
    }
    result.push(...Array<VocationId>(count).fill(vocation));
  }
  return result;
}

export function serializeCharacter(character: CharacterInfo): string {
  const validated = validateCharacterInfo(character);
  // Pawn sharing is introduced with the versioned format in Phase 6 PR 03.
  if (validated.characterType !== "arisen") {
    throw new RangeError("現在の共有コード形式はポーンに対応していません。");
  }
  const { vocationPath, weightClass } = validated;
  return [
    VERSION,
    weightClass,
    encodePath(vocationPath.onlyLv1),
    encodePath(vocationPath.forLv10),
    encodePath(vocationPath.forLv100),
    encodePath(vocationPath.forLv200),
  ].join("-");
}

export function parseCharacterCode(code: string): CharacterInfo {
  if (code.length > 1024)
    throw new RestoreCodeError("復元コードが長すぎます。");
  const segments = code.split("-");
  if (segments.length !== 6)
    throw new RestoreCodeError("復元コードの区切り数が正しくありません。");
  const [version, weightClass, onlyLv1, forLv10, forLv100, forLv200] = segments;
  if (version !== VERSION)
    throw new RestoreCodeError(`未対応のバージョンです: ${version || "なし"}`);
  if (!isWeightClass(weightClass))
    throw new RestoreCodeError("体格コードが正しくありません。");

  try {
    return validateCharacterInfo({
      characterType: "arisen",
      weightClass,
      vocationPath: {
        onlyLv1: decodePath(onlyLv1, "onlyLv1"),
        forLv10: decodePath(forLv10, "forLv10"),
        forLv100: decodePath(forLv100, "forLv100"),
        forLv200: decodePath(forLv200, "forLv200"),
      },
    });
  } catch (error) {
    if (error instanceof RestoreCodeError) throw error;
    throw new RestoreCodeError("育成経路の内容が正しくありません。");
  }
}
