import { describe, expect, test } from "vitest";
import type { VocationPath } from "./character";
import { LEVEL_RANGES } from "./levelRanges";
import {
  adjustPath,
  countUnfilledLevels,
  selectVocationForStrategy,
} from "./pathAdjustment";
import { STAT_IDS, type StatId } from "./status";
import type { VocationId } from "./vocations";

const emptyPath: VocationPath = {
  onlyLv1: [],
  forLv10: [],
  forLv100: [],
  forLv200: [],
};

const expectedByStat: Record<StatId, readonly VocationId[]> = {
  hp: ["fighter", "fighter", "warrior", "fighter"],
  st: ["fighter", "strider", "ranger", "strider"],
  atk: ["fighter", "fighter", "assassin", "assassin"],
  matk: ["mage", "mage", "sorcerer", "sorcerer"],
  def: ["fighter", "fighter", "fighter", "fighter"],
  mdef: ["mage", "mage", "sorcerer", "mage"],
};

describe("能力を最大化する職業の選択", () => {
  test.each(STAT_IDS)(
    "%s は各レベル帯の選択可能職業から最大値を選ぶ",
    (statId) => {
      const strategy = { kind: "maximize-stat", statId } as const;
      expect(
        LEVEL_RANGES.map((range) =>
          selectVocationForStrategy(range, strategy, "arisen"),
        ),
      ).toEqual(expectedByStat[statId]);
    },
  );

  test("同値は選択可能職業の定義順で決まる", () => {
    expect(
      selectVocationForStrategy(
        LEVEL_RANGES[0],
        {
          kind: "maximize-stat",
          statId: "st",
        },
        "arisen",
      ),
    ).toBe("fighter");
    expect(
      selectVocationForStrategy(
        LEVEL_RANGES[3],
        {
          kind: "maximize-stat",
          statId: "hp",
        },
        "arisen",
      ),
    ).toBe("fighter");
    expect(
      selectVocationForStrategy(
        LEVEL_RANGES[3],
        {
          kind: "maximize-stat",
          statId: "mdef",
        },
        "arisen",
      ),
    ).toBe("mage");
  });
});

test.each(STAT_IDS)("%s 特化で空の経路の全枠を埋める", (statId) => {
  const result = adjustPath(
    emptyPath,
    {
      strategy: { kind: "maximize-stat", statId },
      scope: { kind: "unfilled" },
    },
    "arisen",
  );
  expect(result.changedCount).toBe(200);
  expect(countUnfilledLevels(result.path)).toBe(0);
  for (const [index, range] of LEVEL_RANGES.entries()) {
    expect(result.path[range.id]).toEqual(
      Array(range.to - range.from + 1).fill(expectedByStat[statId][index]),
    );
  }
  expect(result.path).not.toBe(emptyPath);
  expect(countUnfilledLevels(emptyPath)).toBe(200);
});

test("途中までの経路では既存の選択と順序を保って空き枠だけ追加する", () => {
  const path: VocationPath = {
    onlyLv1: ["strider"],
    forLv10: ["mage", "fighter"],
    forLv100: ["assassin", "mage", "assassin"],
    forLv200: Array(100).fill("warrior"),
  };
  const before = structuredClone(path);
  const result = adjustPath(
    path,
    {
      strategy: { kind: "maximize-stat", statId: "matk" },
      scope: { kind: "unfilled" },
    },
    "arisen",
  );

  expect(countUnfilledLevels(path)).toBe(94);
  expect(result.changedCount).toBe(94);
  expect(result.path.onlyLv1).toEqual(["strider"]);
  expect(result.path.forLv10).toEqual([
    "mage",
    "fighter",
    ...Array(7).fill("mage"),
  ]);
  expect(result.path.forLv100).toEqual([
    "assassin",
    "mage",
    "assassin",
    ...Array(87).fill("sorcerer"),
  ]);
  expect(result.path.forLv200).toEqual(path.forLv200);
  expect(path).toEqual(before);
  expect(result.path).not.toBe(path);
  expect(result.path.forLv10).not.toBe(path.forLv10);
});

test("満杯の経路では変更件数が 0 で内容を変えない", () => {
  const full: VocationPath = {
    onlyLv1: ["fighter"],
    forLv10: Array(9).fill("strider"),
    forLv100: Array(90).fill("assassin"),
    forLv200: Array(100).fill("mage"),
  };
  const result = adjustPath(
    full,
    {
      strategy: { kind: "maximize-stat", statId: "hp" },
      scope: { kind: "unfilled" },
    },
    "arisen",
  );
  expect(countUnfilledLevels(full)).toBe(0);
  expect(result.changedCount).toBe(0);
  expect(result.path).toEqual(full);
  expect(result.path).not.toBe(full);
});
