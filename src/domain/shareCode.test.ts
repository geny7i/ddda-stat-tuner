import { describe, expect, test } from "vitest";
import type { CharacterInfo } from "./character";
import {
  parseCharacterCode,
  RestoreCodeError,
  serializeCharacter,
} from "./shareCode";
import { VOCATION_IDS } from "./vocations";
import { WEIGHT_CLASSES } from "./status";

const legacyCharacter: CharacterInfo = {
  characterType: "arisen",
  weightClass: "ll",
  vocationPath: {
    onlyLv1: [VOCATION_IDS.fighter],
    forLv10: Array(9).fill(VOCATION_IDS.fighter),
    forLv100: Array(90).fill(VOCATION_IDS.assassin),
    forLv200: Array(100).fill(VOCATION_IDS.sorcerer),
  },
};

describe("共有コード", () => {
  test.each(["arisen", "pawn"] as const)(
    "新形式は%sの空・途中・完成経路を全体格で往復する",
    (characterType) => {
      for (const weightClass of WEIGHT_CLASSES) {
        for (const vocationPath of [
          { onlyLv1: [], forLv10: [], forLv100: [], forLv200: [] },
          {
            onlyLv1: ["mage"],
            forLv10: ["fighter", "mage"],
            forLv100: ["warrior", "ranger"],
            forLv200: ["sorcerer"],
          },
          {
            onlyLv1: ["mage"],
            forLv10: Array(9).fill("mage"),
            forLv100: Array(90).fill("warrior"),
            forLv200: Array(100).fill("sorcerer"),
          },
        ] as const) {
          const character = { characterType, weightClass, vocationPath };
          const code = serializeCharacter(character);
          expect(code.startsWith(`2-${characterType}-${weightClass}-`)).toBe(
            true,
          );
          expect(parseCharacterCode(code)).toEqual(character);
        }
      }
    },
  );
  test("既存形式の共有コードを覚者として復元し、新形式で生成する", () => {
    const legacyCode = "1-ll-z-z9-t5a-u64";
    expect(parseCharacterCode(legacyCode)).toEqual(legacyCharacter);
    expect(serializeCharacter(legacyCharacter)).toBe(
      "2-arisen-ll-z-z9-t5a-u64",
    );
  });

  test("空または職業が混在する未完成の経路を往復できる", () => {
    const character: CharacterInfo = {
      characterType: "arisen",
      weightClass: "s",
      vocationPath: {
        onlyLv1: [],
        forLv10: [VOCATION_IDS.fighter, VOCATION_IDS.mage],
        forLv100: [
          VOCATION_IDS.assassin,
          VOCATION_IDS.assassin,
          VOCATION_IDS.ranger,
        ],
        forLv200: [],
      },
    };
    expect(serializeCharacter(character)).toBe("2-arisen-s--zx-t2v-");
    expect(parseCharacterCode(serializeCharacter(character))).toEqual(
      character,
    );
    expect(parseCharacterCode("1-m----")).toEqual({
      characterType: "arisen",
      weightClass: "m",
      vocationPath: {
        onlyLv1: [],
        forLv10: [],
        forLv100: [],
        forLv200: [],
      },
    });
  });

  test.each([
    ["", "区切り数"],
    ["3-m----", "未対応のバージョン"],
    ["2-m----", "区切り数"],
    ["2-unknown-m----", "種別コード"],
    ["2--m----", "種別コード"],
    ["2-pawn-xl----", "体格コード"],
    ["2-pawn-m-q---", "不明な職業コード"],
    ["2-pawn-m-z2---", "上限"],
    ["2-pawn-m--w--", "選択できない職業"],
    ["2-pawn-m---t-", "ポーンでは選択できない職業"],
    ["2-pawn-m---s-", "ポーンでは選択できない職業"],
    ["2-pawn-m----r", "ポーンでは選択できない職業"],
    ["2-pawn-m---w5b-", "上限"],
    ["1-xl----", "体格コード"],
    ["1-m-q---", "不明な職業コード"],
    ["1-m-z2---", "上限"],
    ["1-m--t--", "選択できない職業"],
    ["1-m--z0--", "件数"],
    ["1-m--z00000000000000000000000000000001--", "件数"],
    [`1-m-${"z".repeat(1025)}---`, "長すぎ"],
  ])("不正なコード %s を拒否する", (code, message) => {
    expect(() => parseCharacterCode(code)).toThrow(RestoreCodeError);
    expect(() => parseCharacterCode(code)).toThrow(message);
  });
});
