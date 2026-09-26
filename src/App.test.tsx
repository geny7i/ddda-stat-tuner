import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createAppStore } from "./app/store";
import { App } from "./App";

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  window.location.hash = "#/";
});

afterEach(() => vi.restoreAllMocks());

test("メニューと育成計画のリンクから使い方ページへ移動できる", async () => {
  const user = userEvent.setup();
  render(
    <Provider store={createAppStore()}>
      <App />
    </Provider>,
  );

  expect(screen.getByRole("heading", { name: "育成計画" })).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "チャート" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "育成計画の使い方" }),
  ).not.toBeInTheDocument();
  const menu = within(
    screen.getByRole("navigation", { name: "メインメニュー" }),
  );
  await user.click(menu.getByRole("link", { name: "使い方" }));
  expect(
    await screen.findByRole("heading", { name: "使い方", level: 1 }),
  ).toBeInTheDocument();
  expect(window.location.hash).toBe("#/help");
  await user.click(menu.getByRole("link", { name: "育成計画" }));
  const titleRow = screen.getByRole("heading", {
    name: "育成計画",
    level: 1,
  }).parentElement!;
  await user.click(within(titleRow).getByRole("link", { name: "使い方" }));
  expect(
    await screen.findByRole("heading", { name: "使い方", level: 1 }),
  ).toBeInTheDocument();
});
