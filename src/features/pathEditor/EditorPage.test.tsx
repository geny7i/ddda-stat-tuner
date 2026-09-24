import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { expect, test } from "vitest";
import { createAppStore } from "../../app/store";
import { EditorPage } from "./EditorPage";

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
