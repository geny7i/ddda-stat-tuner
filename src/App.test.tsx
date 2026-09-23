import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { beforeEach, expect, test } from "vitest";
import { createAppStore } from "./app/store";
import { App } from "./App";

beforeEach(() => {
  window.location.hash = "#/";
});

test("メニューからチャート画面へ移動できる", async () => {
  const user = userEvent.setup();
  render(
    <Provider store={createAppStore()}>
      <App />
    </Provider>,
  );

  expect(screen.getByRole("heading", { name: "育成計画" })).toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "チャート" }));
  expect(screen.getByRole("heading", { name: "チャート" })).toBeInTheDocument();
  expect(window.location.hash).toBe("#/chart");
});
