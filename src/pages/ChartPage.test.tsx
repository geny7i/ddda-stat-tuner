import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { expect, test } from "vitest";
import { createAppStore } from "../app/store";
import { addSteps, setWeightClass } from "../features/pathEditor/editorSlice";
import { ChartPage } from "./ChartPage";

test("共有状態の現在値を表示し、比較するレベル帯と注目項目を変更できる", async () => {
  const user = userEvent.setup();
  const store = createAppStore();
  store.dispatch(setWeightClass("ll"));
  store.dispatch(addSteps({ range: "onlyLv1", vocation: "fighter", count: 1 }));
  render(
    <Provider store={store}>
      <ChartPage />
    </Provider>,
  );

  expect(screen.getByText("Lv 1")).toBeInTheDocument();
  expect(screen.getByTestId("current-st")).toHaveTextContent("580");
  expect(screen.getAllByRole("meter")).toHaveLength(3);

  await user.click(screen.getByRole("button", { name: "Lv11～100 (0/90)" }));
  expect(store.getState().editor.activeRange).toBe("forLv100");
  expect(screen.getAllByRole("meter")).toHaveLength(9);
  await user.click(screen.getByRole("checkbox", { name: "HP" }));
  expect(store.getState().editor.focusedStats).not.toContain("hp");
});
