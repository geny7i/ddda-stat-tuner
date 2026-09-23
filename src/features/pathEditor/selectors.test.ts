import { expect, test } from "vitest";
import { createAppStore } from "../../app/store";
import { addSteps, setActiveRange, toggleFocusedStat } from "./editorSlice";
import { selectComparisonRows } from "./selectors";

test("比較行は経路変更で再計算せず、レベル帯と注目項目の変更で更新する", () => {
  const store = createAppStore();
  const initialRows = selectComparisonRows(store.getState());
  store.dispatch(addSteps({ range: "onlyLv1", vocation: "fighter", count: 1 }));
  expect(selectComparisonRows(store.getState())).toBe(initialRows);

  store.dispatch(setActiveRange("forLv100"));
  const rangeRows = selectComparisonRows(store.getState());
  expect(rangeRows).not.toBe(initialRows);
  expect(rangeRows).toHaveLength(9);

  store.dispatch(toggleFocusedStat("hp"));
  expect(selectComparisonRows(store.getState())).not.toBe(rangeRows);
});
