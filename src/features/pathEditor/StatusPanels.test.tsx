import { MemoryRouter } from "react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { expect, test } from "vitest";
import { createAppStore } from "../../app/store";
import { EditorPage } from "./EditorPage";

function renderEditor() {
  const store = createAppStore();
  render(
    <Provider store={store}>
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

test("育成経路と体格の変更を現在のステータスへ反映する", async () => {
  const user = userEvent.setup();
  renderEditor();

  expect(screen.getByTestId("current-st")).toHaveTextContent("40");
  await user.click(
    within(screen.getByTestId("palette-fighter")).getByRole("button", {
      name: "fighter 1Lvをドラッグまたは選択",
    }),
  );
  await user.click(screen.getByRole("button", { name: "選択を追加" }));
  expect(screen.getByText("Lv 1")).toBeInTheDocument();
  expect(screen.getByTestId("current-hp")).toHaveTextContent("450");
  expect(screen.getByTestId("current-st")).toHaveTextContent("540");
  expect(screen.getByTestId("current-atk")).toHaveTextContent("80");

  await user.click(screen.getByRole("radio", { name: "L" }));
  expect(screen.getByTestId("current-st")).toHaveTextContent("560");
});

test("注目項目を物理攻撃だけにするとスコアと並び順が変わる", async () => {
  const user = userEvent.setup();
  const store = renderEditor();
  await user.click(screen.getByRole("button", { name: "Lv11～100 (0/90)" }));

  for (const label of ["HP", "ST", "魔法攻撃", "物理防御", "魔法防御"])
    await user.click(screen.getByRole("checkbox", { name: label }));

  const cards = within(
    screen.getByRole("list", { name: "職業と成長値の一覧" }),
  ).getAllByRole("listitem");
  expect(cards[0]).toHaveAttribute("data-testid", "comparison-assassin");
  expect(screen.getByTestId("score-assassin")).toHaveTextContent("6");
  expect(screen.getByTestId("score-warrior")).toHaveTextContent("5");
  expect(store.getState().editor.focusedStats).toEqual(["atk"]);
});
