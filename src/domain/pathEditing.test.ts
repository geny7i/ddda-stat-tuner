import { expect, test } from "vitest";
import { addToPath, removeFromPath, replaceInPath } from "./pathEditing";
import { LEVEL_RANGES } from "./levelRanges";
import { VOCATION_IDS } from "./vocations";
import type { VocationPath } from "./character";

const empty: VocationPath = {
  onlyLv1: [],
  forLv10: [],
  forLv100: [],
  forLv200: [],
};

test.each(LEVEL_RANGES)("$id は数量指定を上限で止める", ({ id, from, to }) => {
  const filled = addToPath(empty, id, VOCATION_IDS.fighter, 100);
  expect(filled[id]).toHaveLength(to - from + 1);
  expect(addToPath(filled, id, VOCATION_IDS.mage, 1)).toBe(filled);
  expect(empty[id]).toEqual([]);
});

test("選択できない職業、存在しない職業の変更・削除を拒否する", () => {
  expect(addToPath(empty, "forLv10", VOCATION_IDS.assassin, 1)).toBe(empty);
  expect(addToPath(empty, "forLv10", VOCATION_IDS.fighter, 0)).toBe(empty);
  expect(
    replaceInPath(empty, "forLv10", VOCATION_IDS.fighter, VOCATION_IDS.mage),
  ).toBe(empty);
  expect(removeFromPath(empty, "forLv10", VOCATION_IDS.fighter)).toBe(empty);
  const path = addToPath(empty, "forLv10", VOCATION_IDS.fighter, 2);
  expect(
    replaceInPath(path, "forLv10", VOCATION_IDS.fighter, VOCATION_IDS.assassin),
  ).toBe(path);
  expect(
    replaceInPath(path, "forLv10", VOCATION_IDS.fighter, VOCATION_IDS.mage)
      .forLv10,
  ).toEqual(["mage", "fighter"]);
});
