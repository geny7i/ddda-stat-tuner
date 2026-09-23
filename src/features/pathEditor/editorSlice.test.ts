import { expect, test } from "vitest";
import { createAppStore } from "../../app/store";
import {
  addSteps,
  applyAdjustment,
  setActiveRange,
  setWeightClass,
} from "./editorSlice";

test("実行時の経路を使って一度に更新し、選択済み職業と体格を保つ", () => {
  const store = createAppStore();
  store.dispatch(setWeightClass("ll"));
  store.dispatch(setActiveRange("forLv100"));
  store.dispatch(addSteps({ range: "onlyLv1", vocation: "fighter", count: 1 }));
  store.dispatch(addSteps({ range: "forLv10", vocation: "strider", count: 2 }));
  const before = store.getState();
  let updates = 0;
  const unsubscribe = store.subscribe(() => {
    updates += 1;
  });

  store.dispatch(
    applyAdjustment({
      strategy: { kind: "maximize-stat", statId: "matk" },
      scope: { kind: "unfilled" },
    }),
  );
  unsubscribe();

  const after = store.getState();
  expect(updates).toBe(1);
  expect(after.editor.path.onlyLv1).toEqual(["fighter"]);
  expect(after.editor.path.forLv10).toEqual([
    "strider",
    "strider",
    ...Array(7).fill("mage"),
  ]);
  expect(after.editor.path.forLv100).toEqual(Array(90).fill("sorcerer"));
  expect(after.editor.path.forLv200).toEqual(Array(100).fill("sorcerer"));
  expect(after.editor.weightClass).toBe("ll");
  expect(after.editor.activeRange).toBe("forLv100");
  expect(before.editor.path.forLv10).toEqual(["strider", "strider"]);
});

test("満杯では経路を更新しない", () => {
  const store = createAppStore();
  store.dispatch(
    applyAdjustment({
      strategy: { kind: "maximize-stat", statId: "hp" },
      scope: { kind: "unfilled" },
    }),
  );
  const full = store.getState();
  store.dispatch(
    applyAdjustment({
      strategy: { kind: "maximize-stat", statId: "atk" },
      scope: { kind: "unfilled" },
    }),
  );
  expect(store.getState()).toBe(full);
});
