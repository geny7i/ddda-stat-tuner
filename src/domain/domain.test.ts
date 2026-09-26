import { describe, expect, test } from "vitest";
import {
  calculateStatus,
  validateCharacterInfo,
  type CharacterInfo,
} from "./character";
import {
  getStatusGrowth,
  sortByFocusedStatIds,
  STATUS_GROWTHS,
} from "./growth";
import {
  getLevelRangeById,
  getLevelRangeForLevel,
  isVocationAvailable,
  LEVEL_RANGES,
  LEVEL_RANGE_IDS,
} from "./levelRanges";
import { getWeightStatusBonus, scoreStatus, WEIGHT_CLASSES } from "./status";
import { VOCATION_IDS } from "./vocations";

const emptyPath = () => ({
  onlyLv1: [],
  forLv10: [],
  forLv100: [],
  forLv200: [],
});

describe("レベル帯と職業", () => {
  test.each([
    [1, LEVEL_RANGE_IDS.onlyLv1],
    [2, LEVEL_RANGE_IDS.forLv10],
    [10, LEVEL_RANGE_IDS.forLv10],
    [11, LEVEL_RANGE_IDS.forLv100],
    [100, LEVEL_RANGE_IDS.forLv100],
    [101, LEVEL_RANGE_IDS.forLv200],
    [200, LEVEL_RANGE_IDS.forLv200],
  ])("Lv%d は %s に属する", (level, expected) => {
    expect(getLevelRangeForLevel(level).id).toBe(expected);
  });

  test.each([0, 201, -1, 10.5, Number.NaN])(
    "範囲外のレベル %s を拒否する",
    (level) => {
      expect(() => getLevelRangeForLevel(level)).toThrow(RangeError);
    },
  );

  test("上級職は Lv10 以下で選択できない", () => {
    expect(
      isVocationAvailable(
        LEVEL_RANGE_IDS.forLv10,
        VOCATION_IDS.warrior,
        "arisen",
      ),
    ).toBe(false);
    expect(
      isVocationAvailable(
        LEVEL_RANGE_IDS.forLv100,
        VOCATION_IDS.warrior,
        "arisen",
      ),
    ).toBe(true);
    expect(
      getLevelRangeById(LEVEL_RANGE_IDS.forLv10).to -
        getLevelRangeById(LEVEL_RANGE_IDS.forLv10).from +
        1,
    ).toBe(9);
  });

  test("すべての選択可能な職業に成長値がちょうど 1 件ある", () => {
    for (const range of LEVEL_RANGES) {
      const actual = STATUS_GROWTHS.filter(
        (growth) => growth.levelRangeId === range.id,
      );
      expect(actual.map(({ vocationId }) => vocationId).sort()).toEqual(
        [...range.availableVocationIds].sort(),
      );
    }
  });
});

describe("成長値と体格補正", () => {
  test("代表的な初期値と境界後の成長値を保つ", () => {
    expect(
      getStatusGrowth(VOCATION_IDS.fighter, LEVEL_RANGE_IDS.onlyLv1).status,
    ).toEqual({
      hp: 450,
      st: 500,
      atk: 80,
      matk: 60,
      def: 80,
      mdef: 60,
    });
    expect(
      getStatusGrowth(VOCATION_IDS.assassin, LEVEL_RANGE_IDS.forLv100).status,
    ).toEqual({
      hp: 22,
      st: 27,
      atk: 6,
      matk: 2,
      def: 2,
      mdef: 1,
    });
    expect(
      getStatusGrowth(VOCATION_IDS.assassin, LEVEL_RANGE_IDS.forLv200).status,
    ).toEqual({
      hp: 5,
      st: 15,
      atk: 3,
      matk: 0,
      def: 1,
      mdef: 0,
    });
    expect(() =>
      getStatusGrowth(VOCATION_IDS.assassin, LEVEL_RANGE_IDS.forLv10),
    ).toThrow(RangeError);
  });

  test("体格は ST に 20 ずつ補正する", () => {
    expect(
      WEIGHT_CLASSES.map((weightClass) => getWeightStatusBonus(weightClass).st),
    ).toEqual([0, 20, 40, 60, 80]);
  });
});

describe("育成経路の検証とステータス算出", () => {
  test("複数のレベル帯と体格補正を合算する", () => {
    const character: CharacterInfo = {
      characterType: "arisen",
      weightClass: "l",
      vocationPath: {
        onlyLv1: [VOCATION_IDS.fighter],
        forLv10: [VOCATION_IDS.fighter, VOCATION_IDS.fighter],
        forLv100: [VOCATION_IDS.assassin],
        forLv200: [VOCATION_IDS.sorcerer],
      },
    };

    expect(calculateStatus(character)).toEqual({
      hp: 542,
      st: 637,
      atk: 94,
      matk: 69,
      def: 88,
      mdef: 66,
    });
    expect(character.vocationPath.forLv10).toEqual([
      VOCATION_IDS.fighter,
      VOCATION_IDS.fighter,
    ]);
  });

  test("未完成の経路も計算でき、体格補正だけを返す", () => {
    expect(
      calculateStatus({
        characterType: "arisen",
        weightClass: "m",
        vocationPath: emptyPath(),
      }),
    ).toEqual({
      hp: 0,
      st: 40,
      atk: 0,
      matk: 0,
      def: 0,
      mdef: 0,
    });
  });

  test("上限超過、選択不可職業、未知の職業・体格、欠けたレベル帯を拒否する", () => {
    expect(() =>
      validateCharacterInfo({
        characterType: "arisen",
        weightClass: "m",
        vocationPath: { ...emptyPath(), onlyLv1: ["fighter", "fighter"] },
      }),
    ).toThrow(RangeError);
    expect(() =>
      validateCharacterInfo({
        characterType: "arisen",
        weightClass: "m",
        vocationPath: { ...emptyPath(), forLv10: ["assassin"] },
      }),
    ).toThrow(RangeError);
    expect(() =>
      validateCharacterInfo({
        characterType: "arisen",
        weightClass: "m",
        vocationPath: { ...emptyPath(), forLv100: ["unknown"] },
      }),
    ).toThrow(RangeError);
    expect(() =>
      validateCharacterInfo({
        characterType: "arisen",
        weightClass: "unknown",
        vocationPath: emptyPath(),
      }),
    ).toThrow(TypeError);
    expect(() =>
      validateCharacterInfo({
        characterType: "arisen",
        weightClass: "m",
        vocationPath: { onlyLv1: [] },
      }),
    ).toThrow(RangeError);
  });
});

describe("スコアと並べ替え", () => {
  test("HP と ST は 10 分の 1 として評価する", () => {
    const status = getStatusGrowth(
      VOCATION_IDS.fighter,
      LEVEL_RANGE_IDS.onlyLv1,
    ).status;
    expect(scoreStatus(status)).toBe(375);
    expect(scoreStatus(status, ["hp", "atk"])).toBe(125);
    expect(scoreStatus(status, ["hp", "hp", "atk"])).toBe(125);
    expect(scoreStatus(status, [])).toBe(0);
  });

  test("注目ステータス順に並べ、元の配列を変更しない", () => {
    const original = [
      getStatusGrowth(VOCATION_IDS.fighter, LEVEL_RANGE_IDS.forLv100),
      getStatusGrowth(VOCATION_IDS.warrior, LEVEL_RANGE_IDS.forLv100),
      getStatusGrowth(VOCATION_IDS.assassin, LEVEL_RANGE_IDS.forLv100),
    ];

    const sorted = sortByFocusedStatIds(original, ["atk"]);
    expect(sorted.map(({ vocationId, score }) => [vocationId, score])).toEqual([
      [VOCATION_IDS.assassin, 6],
      [VOCATION_IDS.warrior, 5],
      [VOCATION_IDS.fighter, 4],
    ]);
    expect(original.map(({ vocationId }) => vocationId)).toEqual([
      VOCATION_IDS.fighter,
      VOCATION_IDS.warrior,
      VOCATION_IDS.assassin,
    ]);
    expect(
      sortByFocusedStatIds(original, []).map(({ vocationId }) => vocationId),
    ).toEqual(original.map(({ vocationId }) => vocationId));
  });
});
