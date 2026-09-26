import { expect, test } from "vitest";
import { createAppStore } from "../../app/store";
import { type CharacterInfo } from "../../domain";
import {
  addSteps,
  applyAdjustment,
  applyRoundingAdjustment,
  replaceStep,
  restoreCharacter,
  setActiveRange,
  setWeightClass,
  switchCharacterType,
  toggleFocusedStat,
} from "./editorSlice";
import { selectCharacterInfo, selectComparisonRows } from "./selectors";

test("種別切り替えは全帯をリセットし体格・注目項目を維持する", () => {
  const store = createAppStore();
  store.dispatch(setWeightClass("ll"));
  store.dispatch(toggleFocusedStat("hp"));
  store.dispatch(
    applyAdjustment({
      strategy: { kind: "maximize-stat", statId: "atk" },
      scope: { kind: "unfilled" },
    }),
  );
  store.dispatch(setActiveRange("forLv200"));
  const before = store.getState().editor;
  store.dispatch(switchCharacterType("arisen"));
  expect(store.getState().editor).toBe(before);
  store.dispatch(switchCharacterType("pawn"));
  const after = store.getState().editor;
  expect(after.characterType).toBe("pawn");
  expect(Object.values(after.path).every((steps) => steps.length === 0)).toBe(
    true,
  );
  expect(after.weightClass).toBe("ll");
  expect(after.focusedStats).toEqual(before.focusedStats);
  expect(after.activeRange).toBe("onlyLv1");
  expect(after.revision).toBe(before.revision + 1);
  expect(after.resetId).toBe(before.resetId + 1);
  store.dispatch(switchCharacterType("arisen"));
  expect(
    Object.values(store.getState().editor.path).every(
      (steps) => steps.length === 0,
    ),
  ).toBe(true);
});

test("入力を変更して元に戻しても、以前の世代の探索結果を適用しない", () => {
  const store = createAppStore();
  const expected = selectCharacterInfo(store.getState());
  const expectedRevision = store.getState().editor.revision;
  store.dispatch(setWeightClass("ll"));
  store.dispatch(setWeightClass("m"));
  const before = store.getState();
  store.dispatch(
    applyRoundingAdjustment({
      expected,
      expectedRevision,
      path: { ...expected.vocationPath, onlyLv1: ["mage"] },
    }),
  );
  expect(store.getState()).toBe(before);
});

test("種別を編集状態・比較・手動編集・自動入力へ渡す", () => {
  const store = createAppStore();
  expect(store.getState().editor.characterType).toBe("arisen");
  const pawn: CharacterInfo = {
    characterType: "pawn",
    weightClass: "ll",
    vocationPath: {
      onlyLv1: [],
      forLv10: [],
      forLv100: ["fighter"],
      forLv200: [],
    },
  };
  store.dispatch(restoreCharacter(pawn));
  expect(selectCharacterInfo(store.getState())).toEqual(pawn);
  expect(selectComparisonRows(store.getState())).toHaveLength(6);
  const before = store.getState();
  store.dispatch(
    addSteps({ range: "forLv100", vocation: "assassin", count: 10 }),
  );
  store.dispatch(
    replaceStep({
      range: "forLv100",
      source: "fighter",
      target: "magick_archer",
    }),
  );
  expect(store.getState()).toBe(before);
  store.dispatch(addSteps({ range: "forLv200", vocation: "ranger", count: 1 }));
  store.dispatch(
    applyAdjustment({
      strategy: { kind: "maximize-stat", statId: "atk" },
      scope: { kind: "unfilled" },
    }),
  );
  expect(store.getState().editor.path.forLv100).toEqual([
    "fighter",
    ...Array(89).fill("warrior"),
  ]);
  expect(store.getState().editor.path.forLv200).toEqual([
    "ranger",
    ...Array(99).fill("warrior"),
  ]);
  expect(store.getState().editor.characterType).toBe("pawn");
  expect(store.getState().editor.weightClass).toBe("ll");
  store.dispatch(restoreCharacter({ ...pawn, characterType: "arisen" }));
  expect(selectComparisonRows(store.getState())).toHaveLength(9);
});

test("種別に反する復元・調整結果を拒否し、種別違いの古い結果は適用しない", () => {
  const store = createAppStore();
  const pawn: CharacterInfo = {
    characterType: "pawn",
    weightClass: "m",
    vocationPath: {
      onlyLv1: [],
      forLv10: [],
      forLv100: ["fighter"],
      forLv200: [],
    },
  };
  store.dispatch(restoreCharacter(pawn));
  const before = store.getState();
  const forbidden = { ...pawn.vocationPath, forLv100: ["assassin"] } as const;
  expect(() =>
    store.dispatch(restoreCharacter({ ...pawn, vocationPath: forbidden })),
  ).toThrow("選択できない職業");
  expect(store.getState()).toBe(before);
  expect(() =>
    store.dispatch(
      applyRoundingAdjustment({
        expectedRevision: store.getState().editor.revision,
        expected: pawn,
        path: forbidden,
      }),
    ),
  ).toThrow("選択できない職業");
  expect(store.getState()).toBe(before);
  store.dispatch(
    applyRoundingAdjustment({
      expectedRevision: store.getState().editor.revision,
      expected: { ...pawn, characterType: "arisen" },
      path: { ...pawn.vocationPath, forLv100: ["mage"] },
    }),
  );
  expect(store.getState()).toBe(before);
});

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

test("倍数調整は開始時の経路と体格が一致する場合だけ一度に反映する", () => {
  const store = createAppStore();
  const expected = {
    characterType: "arisen",
    vocationPath: {
      onlyLv1: ["fighter"],
      forLv10: Array(9).fill("fighter"),
      forLv100: Array(90).fill("fighter"),
      forLv200: Array(100).fill("fighter"),
    },
    weightClass: "m",
  } as const;
  const path = {
    ...expected.vocationPath,
    forLv200: ["strider", ...Array(99).fill("fighter")],
  };
  store.dispatch(restoreCharacter(expected));
  let updates = 0;
  const unsubscribe = store.subscribe(() => {
    updates++;
  });
  store.dispatch(
    applyRoundingAdjustment({
      expectedRevision: store.getState().editor.revision,
      expected,
      path,
    }),
  );
  unsubscribe();
  expect(updates).toBe(1);
  expect(store.getState().editor.path.forLv200[0]).toBe("strider");

  store.dispatch(restoreCharacter(expected));
  store.dispatch(setWeightClass("ll"));
  store.dispatch(
    applyRoundingAdjustment({
      expectedRevision: store.getState().editor.revision,
      expected,
      path,
    }),
  );
  expect(store.getState().editor.path.forLv200[0]).toBe("fighter");

  store.dispatch(setWeightClass("m"));
  store.dispatch(
    replaceStep({ range: "forLv200", source: "fighter", target: "mage" }),
  );
  store.dispatch(
    applyRoundingAdjustment({
      expectedRevision: store.getState().editor.revision,
      expected,
      path,
    }),
  );
  expect(store.getState().editor.path.forLv200[0]).toBe("mage");
});
