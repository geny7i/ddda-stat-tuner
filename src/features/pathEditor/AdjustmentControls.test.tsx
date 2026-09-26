import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { type CharacterInfo } from "../../domain";
import { AdjustmentControls } from "./AdjustmentControls";

function makeCharacter(unfilled = 0): CharacterInfo {
  return {
    characterType: "arisen",
    weightClass: "m",
    vocationPath: {
      onlyLv1: ["fighter"],
      forLv10: Array(9).fill("fighter"),
      forLv100: Array(90).fill("fighter"),
      forLv200: Array(100 - unfilled).fill("fighter"),
    },
  };
}

test("成立しない倍数調整は再試行エラーや成功として扱わず、理由を示す", async () => {
  const user = userEvent.setup();
  const onRound = vi.fn().mockResolvedValue({
    kind: "impossible",
    reason: "pawn-mage-parity",
    mageCount: 2,
  });
  render(
    <AdjustmentControls
      character={makeCharacter(0)}
      revision={0}
      unfilledCount={0}
      onApply={() => ({ changedCount: 0, revision: 0 })}
      onRound={async (multiple) => ({
        result: await onRound(multiple),
        revision: 0,
      })}
    />,
  );
  await user.selectOptions(screen.getByRole("combobox"), "round-10");
  await user.click(screen.getByRole("button", { name: "自動調整を実行" }));
  expect(screen.getByRole("status")).toHaveTextContent(
    "現在は2回のため実行できません",
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "5の倍数への調整は利用できます",
  );
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).not.toHaveTextContent("もう一度");
});

test("6種類の説明を実行前に示し、追加件数を通知する", async () => {
  const onApply = vi.fn().mockReturnValue(7);
  const user = userEvent.setup();
  render(
    <AdjustmentControls
      character={makeCharacter(7)}
      revision={0}
      unfilledCount={7}
      onApply={(statId) => ({ changedCount: onApply(statId), revision: 0 })}
      onRound={vi.fn()}
    />,
  );

  const select = screen.getByRole("combobox", { name: "調整の種類" });
  expect(screen.getAllByRole("option")).toHaveLength(8);
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
  render(
    <AdjustmentControls
      character={makeCharacter(0)}
      revision={0}
      unfilledCount={0}
      onApply={(statId) => ({ changedCount: onApply(statId), revision: 0 })}
      onRound={vi.fn()}
    />,
  );
  expect(screen.getByText("変更対象: 0 レベル")).toBeVisible();
  expect(screen.getByRole("button", { name: "自動調整を実行" })).toBeDisabled();
  expect(onApply).not.toHaveBeenCalled();
});

test("倍数調整は200Lv入力済みの場合だけ実行できる", async () => {
  const onRound = vi.fn();
  const user = userEvent.setup();
  const { rerender } = render(
    <AdjustmentControls
      character={makeCharacter(2)}
      revision={0}
      unfilledCount={2}
      onApply={() => ({ changedCount: 0, revision: 0 })}
      onRound={async (multiple) => ({
        result: await onRound(multiple),
        revision: 0,
      })}
    />,
  );
  const select = screen.getByRole("combobox", { name: "調整の種類" });
  await user.selectOptions(select, "round-10");
  expect(select).toHaveAccessibleDescription(/全200Lvの選択後に実行できます/);
  expect(screen.getByText("実行には残り2Lvの選択が必要です。")).toBeVisible();
  expect(screen.getByRole("button", { name: "自動調整を実行" })).toBeDisabled();

  rerender(
    <AdjustmentControls
      character={makeCharacter(0)}
      revision={0}
      unfilledCount={0}
      onApply={() => ({ changedCount: 0, revision: 0 })}
      onRound={async (multiple) => ({
        result: await onRound(multiple),
        revision: 0,
      })}
    />,
  );
  expect(screen.getByText("変更対象: 最大26Lv")).toBeVisible();
  expect(screen.getByRole("button", { name: "自動調整を実行" })).toBeEnabled();
});

test("倍数調整の結果を通知し、変更前後の値を示す", async () => {
  const user = userEvent.setup();
  const status = { hp: 100, st: 200, atk: 30, matk: 40, def: 50, mdef: 60 };
  const onRound = vi.fn().mockResolvedValue({
    kind: "found",
    changedCount: 2,
    beforeStatus: { ...status, atk: 29 },
    afterStatus: status,
    beforeScore: 189,
    afterScore: 190,
  });
  render(
    <AdjustmentControls
      character={makeCharacter(0)}
      revision={0}
      unfilledCount={0}
      onApply={() => ({ changedCount: 0, revision: 0 })}
      onRound={async (multiple) => ({
        result: await onRound(multiple),
        revision: 0,
      })}
    />,
  );
  await user.selectOptions(screen.getByRole("combobox"), "round-10");
  await user.click(screen.getByRole("button", { name: "自動調整を実行" }));
  expect(onRound).toHaveBeenCalledWith(10);
  expect(await screen.findByRole("status")).toHaveTextContent(
    "2Lvを変更しました",
  );
  const table = screen.getByRole("table", {
    name: "調整前後のステータスとスコア",
  });
  expect(
    within(table).getByRole("row", { name: "物理攻撃 29 30" }),
  ).toBeVisible();
  expect(
    within(table).getByRole("row", { name: "スコア 189 190" }),
  ).toBeVisible();
});

test("探索エラーと古い探索結果を別の通知で示す", async () => {
  const user = userEvent.setup();
  const onRound = vi
    .fn()
    .mockRejectedValueOnce(new Error("worker failed"))
    .mockResolvedValueOnce({ kind: "stale" });
  render(
    <AdjustmentControls
      character={makeCharacter(0)}
      revision={0}
      unfilledCount={0}
      onApply={() => ({ changedCount: 0, revision: 0 })}
      onRound={async (multiple) => ({
        result: await onRound(multiple),
        revision: 0,
      })}
    />,
  );
  await user.selectOptions(screen.getByRole("combobox"), "round-5");
  const button = screen.getByRole("button", { name: "自動調整を実行" });
  await user.click(button);
  expect(await screen.findByRole("status")).toHaveTextContent(
    "探索を実行できませんでした",
  );
  await user.click(button);
  expect(await screen.findByRole("status")).toHaveTextContent(
    "結果を適用しませんでした",
  );
});

test("変更が0Lvの場合は既に条件を満たすことを通知する", async () => {
  const user = userEvent.setup();
  const status = { hp: 100, st: 200, atk: 30, matk: 40, def: 50, mdef: 60 };
  const onRound = vi.fn().mockResolvedValue({
    kind: "found",
    changedCount: 0,
    beforeStatus: status,
    afterStatus: status,
    beforeScore: 190,
    afterScore: 190,
  });
  render(
    <AdjustmentControls
      character={makeCharacter(0)}
      revision={0}
      unfilledCount={0}
      onApply={() => ({ changedCount: 0, revision: 0 })}
      onRound={async (multiple) => ({
        result: await onRound(multiple),
        revision: 0,
      })}
    />,
  );
  await user.selectOptions(screen.getByRole("combobox"), "round-5");
  await user.click(screen.getByRole("button", { name: "自動調整を実行" }));
  expect(
    await screen.findByText(/すでに5の倍数です。変更はありません/),
  ).toBeVisible();
});
