import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { expect, test, vi } from "vitest";
import { createAppStore } from "../../app/store";
import type { RoundingSearchResult } from "../../domain";
import { EditorPage } from "./EditorPage";
import { restoreCharacter, setWeightClass } from "./editorSlice";
import { runRoundingSearch } from "./runRoundingSearch";

vi.mock("./runRoundingSearch", () => ({ runRoundingSearch: vi.fn() }));

test("レベル帯を切り替えても経路と体格を保ち、ボタンで変更・削除できる", async () => {
  const user = userEvent.setup();
  const store = createAppStore();
  render(
    <Provider store={store}>
      <EditorPage />
    </Provider>,
  );

  await user.click(screen.getByRole("button", { name: "Lv2～10 (0/9)" }));
  await user.click(
    within(screen.getByTestId("palette-fighter")).getByRole("button", {
      name: "fighter 10Lvをドラッグまたは選択",
    }),
  );
  await user.click(screen.getByRole("button", { name: "選択を追加" }));
  expect(screen.getByTestId("capacity-forLv10")).toHaveTextContent("9/9");

  await user.click(screen.getByRole("button", { name: "Lv11～100 (0/90)" }));
  await user.click(screen.getByRole("button", { name: "Lv2～10 (9/9)" }));
  expect(screen.getByTestId("count-forLv10-fighter")).toHaveTextContent("9Lv");

  await user.click(screen.getByRole("radio", { name: "L" }));
  expect(store.getState().editor.weightClass).toBe("l");

  await user.click(
    screen.getByRole("button", {
      name: "forLv10 の fighter 入替対象に指定",
    }),
  );
  await user.click(
    within(screen.getByTestId("palette-mage")).getByRole("button", {
      name: "1Lv入替",
    }),
  );
  expect(screen.getByTestId("count-forLv10-mage")).toHaveTextContent("1Lv");
  await user.click(
    within(screen.getByTestId("stack-forLv10-mage")).getByRole("button", {
      name: "1Lv削除",
    }),
  );
  expect(store.getState().editor.path.forLv10).toHaveLength(8);
  expect(store.getState().editor.path.forLv10).toEqual(
    Array(8).fill("fighter"),
  );
});

test("探索中に体格を変更した場合は古い結果を適用しない", async () => {
  const user = userEvent.setup();
  const store = createAppStore();
  const path = {
    onlyLv1: ["fighter"],
    forLv10: Array(9).fill("fighter"),
    forLv100: Array(90).fill("fighter"),
    forLv200: Array(100).fill("fighter"),
  } as const;
  store.dispatch(restoreCharacter({ vocationPath: path, weightClass: "m" }));
  let resolveSearch!: (result: RoundingSearchResult) => void;
  vi.mocked(runRoundingSearch).mockReturnValue(
    new Promise((resolve) => {
      resolveSearch = resolve;
    }),
  );
  render(
    <Provider store={store}>
      <EditorPage />
    </Provider>,
  );
  await user.selectOptions(
    screen.getByRole("combobox", { name: "調整の種類" }),
    "round-5",
  );
  await user.click(screen.getByRole("button", { name: "自動調整を実行" }));
  expect(screen.getByRole("button", { name: "自動調整を実行" })).toBeDisabled();
  act(() => store.dispatch(setWeightClass("ll")));
  await act(async () => {
    resolveSearch({
      kind: "found",
      path: { ...path, forLv200: ["strider", ...Array(99).fill("fighter")] },
      changedCount: 1,
      beforeStatus: { hp: 0, st: 0, atk: 0, matk: 0, def: 0, mdef: 0 },
      afterStatus: { hp: 0, st: 0, atk: 0, matk: 0, def: 0, mdef: 0 },
      beforeScore: 0,
      afterScore: 0,
      expandedCount: 1,
      truncated: false,
    });
  });
  expect(screen.getByText(/結果を適用しませんでした/)).toBeVisible();
  expect(store.getState().editor.path).toEqual(path);
  expect(store.getState().editor.weightClass).toBe("ll");
});
