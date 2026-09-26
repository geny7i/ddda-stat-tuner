import { expect, test } from "vitest";
import {
  addToPath,
  removeAllFromPath,
  removeFromPath,
  replaceInPath,
} from "./pathEditing";
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
  const filled = addToPath(empty, id, VOCATION_IDS.fighter, 100, "arisen");
  expect(filled[id]).toHaveLength(to - from + 1);
  expect(addToPath(filled, id, VOCATION_IDS.mage, 1, "arisen")).toBe(filled);
  expect(empty[id]).toEqual([]);
});

test("選択できない職業、存在しない職業の変更・削除を拒否する", () => {
  expect(addToPath(empty, "forLv10", VOCATION_IDS.assassin, 1, "arisen")).toBe(
    empty,
  );
  expect(addToPath(empty, "forLv10", VOCATION_IDS.fighter, 0, "arisen")).toBe(
    empty,
  );
  expect(
    replaceInPath(
      empty,
      "forLv10",
      VOCATION_IDS.fighter,
      VOCATION_IDS.mage,
      "arisen",
    ),
  ).toBe(empty);
  expect(removeFromPath(empty, "forLv10", VOCATION_IDS.fighter)).toBe(empty);
  const path = addToPath(empty, "forLv10", VOCATION_IDS.fighter, 2, "arisen");
  expect(
    replaceInPath(
      path,
      "forLv10",
      VOCATION_IDS.fighter,
      VOCATION_IDS.assassin,
      "arisen",
    ),
  ).toBe(path);
  expect(
    replaceInPath(
      path,
      "forLv10",
      VOCATION_IDS.fighter,
      VOCATION_IDS.mage,
      "arisen",
    ).forLv10,
  ).toEqual(["mage", "fighter"]);
});

test("指定したレベル帯の職業だけを全Lv削除し、他の職業と帯を残す", () => {
  const path: VocationPath = {
    onlyLv1: ["fighter"],
    forLv10: ["fighter", "mage", "fighter"],
    forLv100: ["fighter", "fighter"],
    forLv200: [],
  };
  const updated = removeAllFromPath(path, "forLv10", "fighter");
  expect(updated).toEqual({ ...path, forLv10: ["mage"] });
  expect(path.forLv10).toEqual(["fighter", "mage", "fighter"]);
  expect(removeAllFromPath(updated, "forLv10", "fighter")).toBe(updated);
});
