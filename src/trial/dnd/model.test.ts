import { expect, test } from "vitest";
import { VOCATION_IDS } from "../../domain";
import {
  addSelection,
  applyDrop,
  initialTrialState,
  removeOne,
  replaceOne,
  selectionId,
  stackId,
  rangeId,
} from "./model";

test("×100 の追加も帯の上限で止まり、満杯では更新しない", () => {
  const filled = applyDrop(
    initialTrialState,
    selectionId(VOCATION_IDS.fighter, 100),
    rangeId("forLv100"),
  );
  expect(filled.path.forLv100).toHaveLength(90);
  expect(filled.updates).toBe(1);
  expect(addSelection(filled, "forLv100", VOCATION_IDS.mage, 1).updates).toBe(
    1,
  );
});

test("Lv10 まで選べない職業と不正なドロップ先を拒否する", () => {
  const invalidVocation = applyDrop(
    initialTrialState,
    selectionId(VOCATION_IDS.assassin, 1),
    rangeId("forLv10"),
  );
  expect(invalidVocation.path.forLv10).toEqual([]);
  expect(invalidVocation.updates).toBe(0);
  expect(
    applyDrop(initialTrialState, selectionId(VOCATION_IDS.fighter, 1), null),
  ).toBe(initialTrialState);
  expect(
    applyDrop(initialTrialState, "selection:fighter:bogus", rangeId("forLv10")),
  ).toBe(initialTrialState);
});

test("配置済みの職業 1 件だけを変更・削除できる", () => {
  const fighter = addSelection(
    initialTrialState,
    "forLv100",
    VOCATION_IDS.fighter,
    10,
  );
  const mage = addSelection(fighter, "forLv100", VOCATION_IDS.mage, 1);
  const replaced = applyDrop(
    mage,
    stackId("forLv100", VOCATION_IDS.fighter),
    stackId("forLv100", VOCATION_IDS.mage),
  );
  expect(
    replaced.path.forLv100.filter((id) => id === VOCATION_IDS.fighter),
  ).toHaveLength(9);
  expect(
    replaced.path.forLv100.filter((id) => id === VOCATION_IDS.mage),
  ).toHaveLength(2);
  expect(replaced.updates).toBe(3);
  expect(
    removeOne(replaced, "forLv100", VOCATION_IDS.mage).path.forLv100.filter(
      (id) => id === VOCATION_IDS.mage,
    ),
  ).toHaveLength(1);
  expect(
    replaceOne(replaced, "forLv10", VOCATION_IDS.fighter, VOCATION_IDS.mage)
      .updates,
  ).toBe(3);
});
