import { expect, test } from "vitest";
import {
  calculateStatus,
  validateCharacterInfo,
  type CharacterInfo,
  type VocationPath,
} from "./character";
import { type CharacterType } from "./characterType";
import { getComparisonRows } from "./growth";
import {
  getAvailableVocations,
  isVocationAvailable,
  LEVEL_RANGES,
} from "./levelRanges";
import { addToPath, replaceInPath } from "./pathEditing";
import { adjustPath } from "./pathAdjustment";
import { serializeCharacter } from "./shareCode";
import { STAT_IDS, type StatId } from "./status";
import { VOCATIONS, type VocationId } from "./vocations";

const empty: VocationPath = {
  onlyLv1: [],
  forLv10: [],
  forLv100: [],
  forLv200: [],
};
const pawn: CharacterInfo = {
  characterType: "pawn",
  weightClass: "m",
  vocationPath: empty,
};
const basic = ["fighter", "strider", "mage"];
const advanced = [...basic, "warrior", "ranger", "sorcerer"];

test("種別と全レベル帯の職業制限を適用し、定義順を保つ", () => {
  for (const range of LEVEL_RANGES) {
    const expected = range.to <= 10 ? basic : advanced;
    expect(getAvailableVocations(range.id, "pawn")).toEqual(expected);
    expect(getAvailableVocations(range.id, "arisen")).toEqual(
      range.availableVocationIds,
    );
    expect(
      getComparisonRows(range, [], "pawn").map((row) => row.vocationId),
    ).toEqual(expected);
    for (const vocation of VOCATIONS) {
      expect(isVocationAvailable(range.id, vocation, "pawn")).toBe(
        expected.includes(vocation),
      );
      const character = {
        ...pawn,
        vocationPath: { ...empty, [range.id]: [vocation] },
      };
      if (expected.includes(vocation)) {
        expect(validateCharacterInfo(character)).toEqual(character);
        expect(calculateStatus(character)).toEqual(
          calculateStatus({ ...character, characterType: "arisen" }),
        );
      } else {
        expect(() => validateCharacterInfo(character)).toThrow(
          "選択できない職業",
        );
      }
    }
  }
});

test.each([undefined, null, "unknown", "", 0])(
  "不正な種別 %s を覚者に補完せず拒否する",
  (characterType) => {
    expect(() => validateCharacterInfo({ ...pawn, characterType })).toThrow(
      "種別",
    );
    expect(() =>
      getAvailableVocations("forLv100", characterType as CharacterType),
    ).toThrow("種別");
  },
);

test.each(["assassin", "magick_archer", "mystic_knight"] as const)(
  "ポーンの追加・入れ替えで %s を拒否する",
  (vocation) => {
    for (const range of LEVEL_RANGES) {
      expect(addToPath(empty, range.id, vocation, 1, "pawn")).toBe(empty);
      const path = addToPath(empty, range.id, "fighter", 1, "pawn");
      const before = structuredClone(path);
      expect(replaceInPath(path, range.id, "fighter", vocation, "pawn")).toBe(
        path,
      );
      const replaced = replaceInPath(path, range.id, "fighter", "mage", "pawn");
      expect(replaced[range.id]).toEqual(["mage"]);
      expect(path).toEqual(before);
      if (range.to > 10) {
        expect(
          addToPath(path, range.id, vocation, 1, "arisen")[range.id],
        ).toEqual(["fighter", vocation]);
      }
    }
  },
);

const expectedByStat: Record<StatId, readonly VocationId[]> = {
  hp: ["fighter", "fighter", "warrior", "fighter"],
  st: ["fighter", "strider", "ranger", "strider"],
  atk: ["fighter", "fighter", "warrior", "warrior"],
  matk: ["mage", "mage", "sorcerer", "sorcerer"],
  def: ["fighter", "fighter", "fighter", "fighter"],
  mdef: ["mage", "mage", "sorcerer", "mage"],
};

test.each(STAT_IDS)(
  "ポーンの %s 特化は選択済み入力を保ち、使用可能職の最大成長値で埋める",
  (statId) => {
    const path: VocationPath = {
      onlyLv1: [],
      forLv10: ["mage", "strider"],
      forLv100: ["sorcerer", "ranger"],
      forLv200: ["fighter"],
    };
    const before = structuredClone(path);
    const request = {
      strategy: { kind: "maximize-stat", statId },
      scope: { kind: "unfilled" },
    } as const;
    const result = adjustPath(path, request, "pawn");
    expect(result.changedCount).toBe(195);
    for (const [index, range] of LEVEL_RANGES.entries()) {
      expect(result.path[range.id]).toEqual([
        ...path[range.id],
        ...Array(range.to - range.from + 1 - path[range.id].length).fill(
          expectedByStat[statId][index],
        ),
      ]);
    }
    expect(path).toEqual(before);
    expect(
      validateCharacterInfo({ ...pawn, vocationPath: result.path })
        .vocationPath,
    ).toEqual(result.path);
    expect(adjustPath(result.path, request, "pawn").changedCount).toBe(0);
  },
);

test("禁止職業を含む入力をポーンの編集・自動入力へ渡すと拒否する", () => {
  const path: VocationPath = { ...empty, forLv100: ["assassin"] };
  expect(() => addToPath(path, "forLv100", "fighter", 1, "pawn")).toThrow(
    "選択できない職業",
  );
  expect(() =>
    replaceInPath(path, "forLv100", "assassin", "fighter", "pawn"),
  ).toThrow("選択できない職業");
  expect(() =>
    adjustPath(
      path,
      {
        strategy: { kind: "maximize-stat", statId: "atk" },
        scope: { kind: "unfilled" },
      },
      "pawn",
    ),
  ).toThrow("選択できない職業");
});

test("ポーンを種別の保存に未対応の旧形式で共有しない", () => {
  expect(() => serializeCharacter(pawn)).toThrow(
    "共有コード形式はポーンに対応していません",
  );
});
