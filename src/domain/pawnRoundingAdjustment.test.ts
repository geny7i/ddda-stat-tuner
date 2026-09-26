import { expect, test } from "vitest";
import {
  calculateStatus,
  validateCharacterInfo,
  type CharacterInfo,
  type VocationPath,
} from "./character";
import { getAvailableVocations, LEVEL_RANGES } from "./levelRanges";
import {
  getRoundingChangeLimits,
  getRoundingEligibility,
  searchRoundingAdjustment,
  type RoundingMultiple,
} from "./roundingAdjustment";
import { scoreStatus, STAT_IDS, WEIGHT_CLASSES } from "./status";
import { type VocationId } from "./vocations";

function character(
  initial: "fighter" | "strider" | "mage",
  vocation: VocationId,
  mageCount: number,
): CharacterInfo {
  return {
    characterType: "pawn",
    weightClass: "m",
    vocationPath: {
      onlyLv1: [initial],
      forLv10: [
        ...Array<VocationId>(mageCount).fill("mage"),
        ...Array<VocationId>(9 - mageCount).fill(
          initial === "mage" ? "fighter" : initial,
        ),
      ],
      forLv100: Array<VocationId>(90).fill(vocation),
      forLv200: Array<VocationId>(100).fill(vocation),
    },
  };
}

function verify(input: CharacterInfo, multiple: RoundingMultiple) {
  const original = structuredClone(input);
  const result = searchRoundingAdjustment(input, multiple);
  expect(result.kind).toBe("found");
  if (result.kind !== "found")
    throw new Error("Expected a valid pawn adjustment");
  const after = calculateStatus({ ...input, vocationPath: result.path });
  expect(result.afterStatus).toEqual(after);
  expect(STAT_IDS.every((id) => after[id] % multiple === 0)).toBe(true);
  expect(result.beforeStatus).toEqual(calculateStatus(input));
  expect(result.beforeScore).toBe(scoreStatus(result.beforeStatus));
  expect(result.afterScore).toBe(scoreStatus(after));
  expect(
    validateCharacterInfo({ ...input, vocationPath: result.path }).vocationPath,
  ).toEqual(result.path);
  expect(result.path.onlyLv1).toEqual(input.vocationPath.onlyLv1);
  expect(result.path.forLv10).toEqual(input.vocationPath.forLv10);
  let changed = 0;
  for (const range of LEVEL_RANGES) {
    expect(result.path[range.id]).toHaveLength(range.to - range.from + 1);
    const count = result.path[range.id].filter(
      (id, i) => id !== input.vocationPath[range.id][i],
    ).length;
    const bound =
      range.id === "forLv100"
        ? multiple === 5
          ? 6
          : 9
        : range.id === "forLv200"
          ? multiple === 5
            ? 6
            : 14
          : 0;
    expect(count).toBeLessThanOrEqual(bound);
    changed += count;
  }
  expect(result.changedCount).toBe(changed);
  expect(result.changedCount).toBeLessThanOrEqual(multiple === 5 ? 12 : 23);
  expect(
    result.path.forLv100.filter((id) => id === "mage").length,
  ).toBeLessThanOrEqual(
    input.vocationPath.forLv100.filter((id) => id === "mage").length,
  );
  expect(result.truncated).toBe(false);
  expect(input).toEqual(original);
  return result;
}

test.each(WEIGHT_CLASSES)(
  "全初期職・6職に偏った経路で成功し、変更上限を守る: %s",
  (weightClass) => {
    for (const initial of ["fighter", "strider", "mage"] as const) {
      for (const vocation of getAvailableVocations("forLv100", "pawn")) {
        verify(
          {
            ...character(initial, vocation, initial === "mage" ? 9 : 0),
            weightClass,
          },
          5,
        );
        verify(
          {
            ...character(initial, vocation, initial === "mage" ? 9 : 1),
            weightClass,
          },
          10,
        );
      }
    }
  },
);

test.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])(
  "10倍数はLv2〜10のメイジ回数 %i の偶奇で判定し、Lv1を数えない",
  (mageCount) => {
    for (const initial of ["fighter", "strider", "mage"] as const) {
      const input = character(initial, "fighter", mageCount);
      if (mageCount % 2 === 1) {
        expect(getRoundingEligibility(input, 10)).toEqual({ kind: "ready" });
        verify(input, 10);
      } else {
        const before = structuredClone(input);
        const impossible = {
          kind: "impossible",
          reason: "pawn-mage-parity",
          mageCount,
        };
        expect(getRoundingEligibility(input, 10)).toEqual(impossible);
        expect(searchRoundingAdjustment(input, 10)).toEqual(impossible);
        expect(input).toEqual(before);
      }
      verify(input, 5);
      expect(
        getRoundingEligibility({ ...input, characterType: "arisen" }, 10),
      ).toEqual({ kind: "ready" });
    }
  },
);

test("未完成経路は初期区間の偶奇を判定せず、残りLvを返す", () => {
  const full = character("mage", "fighter", 0);
  for (const range of LEVEL_RANGES) {
    const input = {
      ...full,
      vocationPath: {
        ...full.vocationPath,
        [range.id]: full.vocationPath[range.id].slice(1),
      },
    };
    for (const multiple of [5, 10] as const) {
      expect(getRoundingEligibility(input, multiple)).toEqual({
        kind: "incomplete",
        unfilledCount: 1,
      });
      expect(searchRoundingAdjustment(input, multiple)).toEqual({
        kind: "incomplete",
        unfilledCount: 1,
      });
    }
  }
});

test("固定シードの混在経路でも復元できる", () => {
  let seed = 20260926;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let sample = 0; sample < 20; sample++) {
    const path = Object.fromEntries(
      LEVEL_RANGES.map((range) => {
        const jobs = getAvailableVocations(range.id, "pawn");
        return [
          range.id,
          Array.from(
            { length: range.to - range.from + 1 },
            () => jobs[Math.floor(random() * jobs.length)],
          ),
        ];
      }),
    ) as Record<keyof VocationPath, VocationId[]>;
    if (path.forLv10.filter((id) => id === "mage").length % 2 === 0) {
      path.forLv10[0] = path.forLv10[0] === "mage" ? "fighter" : "mage";
    }
    const input: CharacterInfo = {
      characterType: "pawn",
      vocationPath: path,
      weightClass: WEIGHT_CLASSES[sample % 5],
    };
    for (const multiple of [5, 10] as const) verify(input, multiple);
  }
});

test.each([5, 10] as const)(
  "%i倍数の結果は決定的で、丸め済みなら変更しない",
  (multiple) => {
    const input = character("fighter", "warrior", 1);
    const result = verify(input, multiple);
    expect(searchRoundingAdjustment(input, multiple)).toEqual(result);
    const rounded = verify({ ...input, vocationPath: result.path }, multiple);
    expect(rounded.path).toEqual(result.path);
    expect(rounded.changedCount).toBe(0);
    expect(rounded.expandedCount).toBe(0);
  },
);

test("前半条件を満たす経路は後半だけを調整する", () => {
  const input = character("fighter", "warrior", 1);
  const rounded = verify(input, 10);
  const suffix = [...rounded.path.forLv200];
  suffix[0] = suffix[0] === "strider" ? "fighter" : "strider";
  const altered = {
    ...input,
    vocationPath: { ...rounded.path, forLv200: suffix },
  };
  const before = calculateStatus(altered);
  expect(STAT_IDS.every((id) => before[id] % 10 === 0)).toBe(false);
  const result = verify(altered, 10);
  expect(result.path.forLv100).toEqual(rounded.path.forLv100);
});

test("種別・倍数ごとの上限を返し、不正な倍数を拒否する", () => {
  expect(getRoundingChangeLimits("pawn", 5)).toEqual({
    forLv100: 6,
    forLv200: 6,
  });
  expect(getRoundingChangeLimits("pawn", 10)).toEqual({
    forLv100: 9,
    forLv200: 14,
  });
  for (const multiple of [5, 10] as const)
    expect(getRoundingChangeLimits("arisen", multiple)).toEqual({
      forLv100: 14,
      forLv200: 12,
    });
  expect(() =>
    getRoundingEligibility(
      character("fighter", "fighter", 1),
      7 as RoundingMultiple,
    ),
  ).toThrow(RangeError);
});

// Bounds for these measured fixtures only, not a guarantee for every path.
test.each([
  { vocation: "warrior", stat: "atk", retained: 0.98 },
  { vocation: "sorcerer", stat: "matk", retained: 0.96 },
  { vocation: "fighter", stat: "def", retained: 0.96 },
] as const)(
  "$vocation に偏った代表経路の $stat とスコアの低下を抑える",
  ({ vocation, stat, retained }) => {
    for (const multiple of [5, 10] as const) {
      const result = verify(character("fighter", vocation, 1), multiple);
      expect(result.afterStatus[stat]).toBeGreaterThanOrEqual(
        result.beforeStatus[stat] * retained,
      );
      expect(result.afterScore).toBeGreaterThanOrEqual(result.beforeScore - 1);
    }
  },
);
