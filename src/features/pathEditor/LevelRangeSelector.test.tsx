import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { VOCATIONS, type VocationPath } from "../../domain";
import { LevelRangeSelector } from "./LevelRangeSelector";

test("4 レベル帯の内訳を切り替えずに表示し、職業とLv数を読み上げる", async () => {
  const onSelect = vi.fn();
  const path: VocationPath = {
    onlyLv1: [],
    forLv10: ["mage", "fighter", "mage"],
    forLv100: ["fighter", ...VOCATIONS, ...VOCATIONS],
    forLv200: Array(100).fill("assassin"),
  };
  render(
    <LevelRangeSelector
      activeRange="forLv10"
      path={path}
      onSelect={onSelect}
    />,
  );

  const empty = screen.getByRole("button", { name: "Lv1～1 (0/1)" });
  expect(empty).not.toHaveAttribute("aria-describedby");
  const mixed = screen.getByRole("button", { name: "Lv2～10 (3/9)" });
  expect(mixed).toHaveAccessibleDescription("mage 2Lv、fighter 1Lv");
  expect(mixed.querySelectorAll("img")).toHaveLength(2);
  const all = screen.getByRole("button", { name: "Lv11～100 (19/90)" });
  expect(all.querySelectorAll("img")).toHaveLength(9);
  expect(all).toHaveAccessibleDescription(/fighter 3Lv/);
  expect(
    screen.getByRole("button", { name: "Lv101～200 (100/100)" }),
  ).toHaveAccessibleDescription("assassin 100Lv");

  await userEvent.click(all);
  expect(onSelect).toHaveBeenCalledWith("forLv100");
});
