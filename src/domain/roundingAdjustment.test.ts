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
import { scoreStatus, STAT_IDS } from "./status";

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
    "%s の成功結果は全能力が倍数で 10Lv 以内の変更",
    (multiple) => {
      const character = multiple === 5 ? fighter : mixed;
      const original = structuredClone(character);
      const result = searchRoundingAdjustment(character, multiple);
      expect(result.kind).toBe("found");
      if (result.kind !== "found") return;

      expect(result.changedCount).toBeLessThanOrEqual(10);
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

  test("1Lv 探索は全候補を比較し、最高スコアと安定した結果を返す", () => {
    const seed = searchRoundingAdjustment(fighter, 5);
    expect(seed.kind).toBe("found");
    if (seed.kind !== "found") return;
    const character: CharacterInfo = { ...fighter, vocationPath: seed.path };
    const result = searchRoundingAdjustment(character, 5, {
      maxChanges: 1,
      maxExpanded: 10_000,
    });
    const validScores: number[] = [];
    if (isRounded(character, 5))
      validScores.push(scoreStatus(calculateStatus(character)));
    for (const range of LEVEL_RANGES) {
      for (const [index, source] of character.vocationPath[
        range.id
      ].entries()) {
        for (const target of range.availableVocationIds) {
          if (target === source) continue;
          const steps = [...character.vocationPath[range.id]];
          steps[index] = target;
          const candidate: CharacterInfo = {
            ...character,
            vocationPath: { ...character.vocationPath, [range.id]: steps },
          };
          if (isRounded(candidate, 5))
            validScores.push(scoreStatus(calculateStatus(candidate)));
        }
      }
    }
    expect(validScores.length).toBeGreaterThan(1);
    expect(result.kind).toBe("found");
    if (result.kind === "found") {
      expect(result.afterScore).toBe(Math.max(...validScores));
    }
    expect(result).toEqual(
      searchRoundingAdjustment(character, 5, {
        maxChanges: 1,
        maxExpanded: 10_000,
      }),
    );
  });

  test("探索上限内で見つからない場合は不能と断定せず経路を返さない", () => {
    const result = searchRoundingAdjustment(fighter, 10, {
      maxChanges: 1,
      maxExpanded: 1,
    });
    expect(result.kind).toBe("not-found");
    if (result.kind === "not-found") {
      expect(result.expandedCount).toBe(1);
      expect(result.truncated).toBe(true);
    }
  });

  test("変更上限と倍数の不正値を拒否する", () => {
    expect(() =>
      searchRoundingAdjustment(fighter, 5, { maxChanges: 11 }),
    ).toThrow(RangeError);
    expect(() =>
      searchRoundingAdjustment(fighter, 5, { beamWidth: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      searchRoundingAdjustment(fighter, 7 as RoundingMultiple),
    ).toThrow(RangeError);
  });
});
