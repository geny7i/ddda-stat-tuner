import { expect, test } from "vitest";
import { getStatusGrowth } from "./growth";
import { STAT_IDS } from "./status";
import { VOCATIONS } from "./vocations";

// Independent exhaustive enumeration of the actual growth table, not the
// solver's compressed transition table. These certify its universal bounds.
function reachable(growths: number[][], bases: number[], levels: number) {
  const encode = (values: number[]) =>
    values.reduce((key, value, i) => key * bases[i] + (value % bases[i]), 0);
  let states = new Map<number, number[]>([[0, bases.map(() => 0)]]);
  for (let level = 0; level < levels; level++) {
    const next = new Map<number, number[]>();
    for (const values of states.values()) {
      for (const growth of growths) {
        const result = values.map((value, i) => (value + growth[i]) % bases[i]);
        next.set(encode(result), result);
      }
    }
    states = next;
  }
  return [...states.values()];
}

test("前半14LvはMageなしでも必要な全剰余に到達する", () => {
  const growths = VOCATIONS.filter((id) => id !== "mage").map((id) => {
    const s = getStatusGrowth(id, "forLv100").status;
    return [s.hp, s.st, s.atk + s.matk + s.def + s.mdef];
  });
  expect(reachable(growths, [10, 10, 10], 14)).toHaveLength(1000);
});

test("後半12Lvは保存条件を満たす全2000剰余に到達する", () => {
  const growths = VOCATIONS.map((id) => {
    const s = getStatusGrowth(id, "forLv200").status;
    expect(s.hp + s.st).toBe(20);
    expect(s.atk + s.matk + s.def + s.mdef).toBe(4);
    return STAT_IDS.map((key) => s[key]);
  });
  const states = reachable(growths, [10, 10, 10, 10, 10, 10], 12);
  expect(states).toHaveLength(2000);
  for (const [hp, st, ...combat] of states) {
    expect(hp === 0 || hp === 5).toBe(true);
    expect(st).toBe(hp);
    expect(combat.reduce((sum, value) => sum + value, 0) % 10).toBe(8);
  }
});
