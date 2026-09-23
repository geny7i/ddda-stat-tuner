import { describe, expect, test } from "vitest";
import type { CharacterInfo } from "./character";
import {
  parseCharacterCode,
  RestoreCodeError,
  serializeCharacter,
} from "./shareCode";
import { VOCATION_IDS } from "./vocations";

const legacyCharacter: CharacterInfo = {
  weightClass: "ll",
  vocationPath: {
    onlyLv1: [VOCATION_IDS.fighter],
    forLv10: Array(9).fill(VOCATION_IDS.fighter),
    forLv100: Array(90).fill(VOCATION_IDS.assassin),
    forLv200: Array(100).fill(VOCATION_IDS.sorcerer),
  },
};

describe("共有コード", () => {
  test("既存形式の共有コードを復元し、同じ形式で生成する", () => {
    const legacyCode = "1-ll-z-z9-t5a-u64";
    expect(parseCharacterCode(legacyCode)).toEqual(legacyCharacter);
    expect(serializeCharacter(legacyCharacter)).toBe(legacyCode);
  });

  test("空または職業が混在する未完成の経路を往復できる", () => {
    const character: CharacterInfo = {
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
    expect(serializeCharacter(character)).toBe("1-s--zx-t2v-");
    expect(parseCharacterCode(serializeCharacter(character))).toEqual(
      character,
    );
    expect(parseCharacterCode("1-m----")).toEqual({
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
    ["2-m----", "未対応のバージョン"],
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
