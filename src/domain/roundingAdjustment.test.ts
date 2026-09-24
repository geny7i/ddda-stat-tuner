import { describe, expect, test } from "vitest";
import {
  calculateStatus,
  type CharacterInfo,
  type VocationPath,
} from "./character";
import { LEVEL_RANGES, type LevelRange } from "./levelRanges";
import {
  searchRoundingAdjustment,
  type RoundingMultiple,
} from "./roundingAdjustment";
import { scoreStatus, STAT_IDS, WEIGHT_CLASSES } from "./status";
import { VOCATIONS } from "./vocations";

function fullPath(vocation: "fighter" | "strider" | "mage"): VocationPath {
  return {
    onlyLv1: [vocation],
    forLv10: Array(9).fill(vocation),
    forLv100: Array(90).fill(vocation),
    forLv200: Array(100).fill(vocation),
  };
}

const fighter: CharacterInfo = {
  vocationPath: fullPath("fighter"),
  weightClass: "m",
};
function cyclicSteps(range: LevelRange) {
  return Array.from(
    { length: range.to - range.from + 1 },
    (_, index) =>
      range.availableVocationIds[index % range.availableVocationIds.length],
  );
}
const mixed: CharacterInfo = {
  vocationPath: {
    onlyLv1: cyclicSteps(LEVEL_RANGES[0]),
    forLv10: cyclicSteps(LEVEL_RANGES[1]),
    forLv100: cyclicSteps(LEVEL_RANGES[2]),
    forLv200: cyclicSteps(LEVEL_RANGES[3]),
  },
  weightClass: "m",
};

function changedLevels(before: VocationPath, after: VocationPath): number {
  return LEVEL_RANGES.reduce(
    (total, range) =>
      total +
      before[range.id].filter((id, index) => id !== after[range.id][index])
        .length,
    0,
  );
}

function isRounded(
  character: CharacterInfo,
  multiple: RoundingMultiple,
): boolean {
  const status = calculateStatus(character);
  return STAT_IDS.every((id) => status[id] % multiple === 0);
}

describe("倍数への調整探索", () => {
  test("200Lv に満たない場合は探索せず空き枠数を返す", () => {
    const character: CharacterInfo = {
      ...fighter,
      vocationPath: {
        ...fighter.vocationPath,
        forLv200: Array(98).fill("fighter"),
      },
    };
    expect(searchRoundingAdjustment(character, 5)).toEqual({
      kind: "incomplete",
      unfilledCount: 2,
    });
  });

  test.each([5, 10] as const)(
    "%s の成功結果は全能力が倍数で 26Lv 以内の変更",
    (multiple) => {
      const character = multiple === 5 ? fighter : mixed;
      const original = structuredClone(character);
      const result = searchRoundingAdjustment(character, multiple);
      expect(result.kind).toBe("found");
      if (result.kind !== "found") return;

      expect(result.changedCount).toBeLessThanOrEqual(26);
      expect(changedLevels(character.vocationPath, result.path)).toBe(
        result.changedCount,
      );
      expect(
        isRounded({ ...character, vocationPath: result.path }, multiple),
      ).toBe(true);
      expect(result.afterStatus).toEqual(
        calculateStatus({ ...character, vocationPath: result.path }),
      );
      expect(result.afterScore).toBe(scoreStatus(result.afterStatus));
      expect(character).toEqual(original);
      for (const range of LEVEL_RANGES) {
        expect(result.path[range.id]).toHaveLength(range.to - range.from + 1);
        expect(
          result.path[range.id].every((id) =>
            range.availableVocationIds.includes(id),
          ),
        ).toBe(true);
      }
    },
  );

  test("すでに倍数の場合は変更せず、結果が安定している", () => {
    const seed = searchRoundingAdjustment(fighter, 10);
    expect(seed.kind).toBe("found");
    if (seed.kind !== "found") return;
    const character = { ...fighter, vocationPath: seed.path };
    const result = searchRoundingAdjustment(character, 10);
    expect(result.kind).toBe("found");
    if (result.kind !== "found") return;
    expect(result.changedCount).toBe(0);
    expect(result.path).toEqual(seed.path);
    expect(result.expandedCount).toBe(0);
    expect(searchRoundingAdjustment(fighter, 10)).toEqual(seed);
  });

  test("不正な倍数を拒否する", () => {
    expect(() =>
      searchRoundingAdjustment(fighter, 7 as RoundingMultiple),
    ).toThrow(RangeError);
  });
});

function verifyAdjustment(
  character: CharacterInfo,
  multiple: RoundingMultiple,
) {
  const original = structuredClone(character);
  const result = searchRoundingAdjustment(character, multiple);
  expect(result.kind).toBe("found");
  if (result.kind !== "found") throw new Error("Expected complete path");
  expect(isRounded({ ...character, vocationPath: result.path }, multiple)).toBe(
    true,
  );
  expect(result.changedCount).toBe(
    changedLevels(character.vocationPath, result.path),
  );
  expect(result.changedCount).toBeLessThanOrEqual(26);
  expect(result.truncated).toBe(false);
  expect(result.path.onlyLv1).toEqual(character.vocationPath.onlyLv1);
  expect(result.path.forLv10).toEqual(character.vocationPath.forLv10);
  for (const [range, bound] of [
    ["forLv100", 14],
    ["forLv200", 12],
  ] as const) {
    expect(
      result.path[range].filter(
        (id, i) => id !== character.vocationPath[range][i],
      ).length,
    ).toBeLessThanOrEqual(bound);
  }
  expect(
    result.path.forLv100.filter((id) => id === "mage").length,
  ).toBeLessThanOrEqual(
    character.vocationPath.forLv100.filter((id) => id === "mage").length,
  );
  expect(character).toEqual(original);
  return result;
}

test.each(WEIGHT_CLASSES)(
  "全職業への偏った経路でも両方の倍数に調整できる: %s",
  (weightClass) => {
    for (const [i, vocation] of VOCATIONS.entries()) {
      const character: CharacterInfo = {
        weightClass,
        vocationPath: {
          ...fullPath((["fighter", "strider", "mage"] as const)[i % 3]),
          forLv100: Array(90).fill(vocation),
          forLv200: Array(100).fill(vocation),
        },
      };
      for (const multiple of [5, 10] as const)
        verifyAdjustment(character, multiple);
    }
  },
);

test("固定シードの混在経路でも変更元の数を超えず復元できる", () => {
  let seed = 123456789;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let sample = 0; sample < 20; sample++) {
    const character: CharacterInfo = {
      weightClass: WEIGHT_CLASSES[sample % WEIGHT_CLASSES.length],
      vocationPath: Object.fromEntries(
        LEVEL_RANGES.map((range) => [
          range.id,
          Array.from(
            { length: range.to - range.from + 1 },
            () =>
              range.availableVocationIds[
                Math.floor(random() * range.availableVocationIds.length)
              ],
          ),
        ]),
      ) as unknown as VocationPath,
    };
    for (const multiple of [5, 10] as const)
      verifyAdjustment(character, multiple);
  }
});

test("物理攻撃特化では強みの低下を抑え、Mageを追加しない", () => {
  const character: CharacterInfo = {
    ...fighter,
    vocationPath: {
      ...fighter.vocationPath,
      forLv100: Array(90).fill("assassin"),
      forLv200: Array(100).fill("assassin"),
    },
  };
  const result = verifyAdjustment(character, 10);
  expect(result.afterStatus.atk).toBeGreaterThanOrEqual(
    result.beforeStatus.atk * 0.97,
  );
  expect(result.afterScore).toBeGreaterThanOrEqual(result.beforeScore - 5);
});
