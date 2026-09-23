import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { AdjustmentControls } from "./AdjustmentControls";

test("6種類の説明を実行前に示し、追加件数を通知する", async () => {
  const onApply = vi.fn().mockReturnValue(7);
  const user = userEvent.setup();
  render(<AdjustmentControls unfilledCount={7} onApply={onApply} />);

  const select = screen.getByRole("combobox", { name: "調整の種類" });
  expect(screen.getAllByRole("option")).toHaveLength(6);
  expect(select).toHaveAccessibleDescription(
    "未選択のレベルだけを対象に、HPの成長値が最大の職業で埋めます。すでに選んだ職業は変更しません。",
  );
  await user.selectOptions(select, "matk");
  expect(select).toHaveAccessibleDescription(/魔法攻撃の成長値が最大/);
  expect(screen.getByText("変更対象: 7 レベル")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "自動調整を実行" }));
  expect(onApply).toHaveBeenCalledWith("matk");
  expect(screen.getByRole("status")).toHaveTextContent(
    "「魔法攻撃 特化で未選択レベルを埋める」を実行し、7 レベルを追加しました。",
  );
});

test("空き枠がないと実行できない", () => {
  const onApply = vi.fn();
  render(<AdjustmentControls unfilledCount={0} onApply={onApply} />);
  expect(screen.getByText("変更対象: 0 レベル")).toBeVisible();
  expect(screen.getByRole("button", { name: "自動調整を実行" })).toBeDisabled();
  expect(onApply).not.toHaveBeenCalled();
});
