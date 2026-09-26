import { expect, test } from "vitest";
import { calculateStatus } from "./character";
import { getStatusGrowth } from "./growth";
import { STAT_IDS, WEIGHT_CLASSES } from "./status";
import { type VocationId } from "./vocations";

// Independent of the solver's candidate list and compressed transition table.
const PAWN_VOCATIONS = [
  "fighter",
  "strider",
  "mage",
  "warrior",
  "ranger",
  "sorcerer",
] as const satisfies readonly VocationId[];

const mod = (value: number, base: number) => ((value % base) + base) % base;

// Enumerate actual growth sums independently of the production DP. Keep full
// six-stat residues for the suffix so hidden constraints cannot be compressed out.
function reachable(growths: number[][], multiple: number, levels: number) {
  let states = new Map<string, number[]>([["zero", growths[0].map(() => 0)]]);
  for (let level = 0; level < levels; level++) {
    const next = new Map<string, number[]>();
    for (const state of states.values()) {
      for (const growth of growths) {
        const result = state.map((value, i) =>
          mod(value + growth[i], multiple),
        );
        next.set(result.join(","), result);
      }
    }
    states = next;
  }
  return [...states.values()];
}

test.each([
  { multiple: 5, levels: 6, size: 25 },
  { multiple: 10, levels: 9, size: 50 },
])(
  "ポーン前半: mod $multiple は $levels Lvで全到達可能剰余を覆う",
  ({ multiple, levels, size }) => {
    const growths = PAWN_VOCATIONS.filter((id) => id !== "mage").map((id) => {
      const s = getStatusGrowth(id, "forLv100").status;
      expect(s.st % 5).toBe(0);
      return [s.hp - s.st, s.atk + s.matk + s.def + s.mdef];
    });
    expect(reachable(growths, multiple, levels - 1).length).toBeLessThan(size);
    const states = reachable(growths, multiple, levels);
    expect(states).toHaveLength(size);
    const keys = new Set(states.map((state) => state.join(",")));
    for (let hpMinusSt = 0; hpMinusSt < multiple; hpMinusSt++) {
      for (let combatSum = 0; combatSum < multiple; combatSum++) {
        expect(keys.has(`${hpMinusSt},${combatSum}`)).toBe(
          multiple === 5 || combatSum % 2 === levels % 2,
        );
      }
    }
  },
);

test.each([
  { multiple: 5, levels: 6, size: 125 },
  { multiple: 10, levels: 14, size: 2000 },
])(
  "ポーン後半: mod $multiple は $levels Lvで保存条件を満たす全剰余を覆う",
  ({ multiple, levels, size }) => {
    const growths = PAWN_VOCATIONS.map((id) => {
      const s = getStatusGrowth(id, "forLv200").status;
      expect(s.hp + s.st).toBe(20);
      expect(s.hp % 5).toBe(0);
      expect(s.st % 5).toBe(0);
      expect(s.atk + s.matk + s.def + s.mdef).toBe(4);
      return STAT_IDS.map((key) => s[key]);
    });
    expect(reachable(growths, multiple, levels - 1).length).toBeLessThan(size);
    const states = reachable(growths, multiple, levels);
    expect(states).toHaveLength(size);
    for (const [hp, st, ...combat] of states) {
      expect(hp % 5).toBe(0);
      expect(st % 5).toBe(0);
      expect((hp + st) % multiple).toBe(0);
      expect(combat.reduce((sum, value) => sum + value, 0) % multiple).toBe(
        (4 * levels) % multiple,
      );
    }
  },
);

test("10倍数の必要条件はLv2〜10のMageが奇数回（全初期職・初期配分・体格）", () => {
  for (const id of PAWN_VOCATIONS) {
    const s = getStatusGrowth(id, "forLv100").status;
    expect((s.atk + s.matk + s.def + s.mdef) % 2).toBe(1);
    expect(s.st % 5).toBe(0);
  }
  for (const initial of ["fighter", "strider", "mage"] as const) {
    for (let mageCount = 0; mageCount <= 9; mageCount++) {
      for (
        let fighterCount = 0;
        fighterCount <= 9 - mageCount;
        fighterCount++
      ) {
        for (const weightClass of WEIGHT_CLASSES) {
          const s = calculateStatus({
            characterType: "pawn",
            weightClass,
            vocationPath: {
              onlyLv1: [initial],
              forLv10: [
                ...Array<VocationId>(mageCount).fill("mage"),
                ...Array<VocationId>(fighterCount).fill("fighter"),
                ...Array<VocationId>(9 - mageCount - fighterCount).fill(
                  "strider",
                ),
              ],
              forLv100: Array<VocationId>(90).fill("fighter"),
              forLv200: Array<VocationId>(100).fill("fighter"),
            },
          });
          expect(s.st % 5).toBe(0);
          expect((s.atk + s.matk + s.def + s.mdef) % 2).toBe(
            (1 + mageCount) % 2,
          );
        }
      }
    }
  }
});
