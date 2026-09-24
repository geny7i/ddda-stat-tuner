import { expect, test } from "@playwright/test";

test("使い方ダイアログを開閉し、見出しと起動ボタンへフォーカスを戻す", async ({
  page,
}) => {
  await page.goto("/#/");
  const helpButton = page.getByRole("button", { name: "育成計画の使い方" });
  const dialog = page.getByRole("dialog", { name: "育成計画の使い方" });

  await helpButton.click();
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "育成計画の使い方" }),
  ).toBeFocused();
  await expect(dialog).toContainText("1Lv入替");
  await expect(dialog).not.toContainText("Space");
  await expect(dialog).not.toContainText("矢印キー");
  await dialog.getByRole("button", { name: "閉じる" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(helpButton).toBeFocused();

  await helpButton.click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(helpButton).toBeFocused();

  await helpButton.click();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "閉じる" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate((element) => {
      const active = document.activeElement;
      return (
        active instanceof HTMLElement &&
        active.matches("button, input, select, textarea, a") &&
        !element.contains(active)
      );
    }),
  ).toBe(false);
  await page.mouse.click(5, 5);
  await expect(dialog).not.toBeVisible();
  await expect(helpButton).toBeFocused();
});

test("注目ステータスを職業一覧内で切り替えて並べ替えと追加へ反映する", async ({
  page,
}) => {
  await page.goto("/#/");
  await page.getByRole("button", { name: "Lv11～100 (0/90)" }).click();
  const comparison = page.locator(".comparison-editable");
  const focusOptions = comparison.getByRole("group", {
    name: "注目するステータス",
  });
  await expect(focusOptions).toBeVisible();
  expect(
    await comparison.evaluate((element) => {
      const heading = element.querySelector("h2");
      const options = element.querySelector(".focus-options");
      const cards = element.querySelector(".comparison-cards");
      return Boolean(
        heading &&
        options &&
        cards &&
        heading.compareDocumentPosition(options) &
          Node.DOCUMENT_POSITION_FOLLOWING &&
        options.compareDocumentPosition(cards) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
  ).toBe(true);

  for (const label of ["HP", "ST", "魔法攻撃", "物理防御", "魔法防御"])
    await focusOptions.getByRole("checkbox", { name: label }).uncheck();
  await expect(comparison.locator(".comparison-card").first()).toHaveAttribute(
    "data-testid",
    "comparison-assassin",
  );
  await page
    .getByTestId("comparison-assassin")
    .getByRole("button", {
      name: "assassin 1Lvをドラッグまたは選択",
    })
    .click();
  await page
    .getByTestId("range-forLv100")
    .getByRole("button", {
      name: "選択を追加",
    })
    .click();
  await expect(page.getByTestId("count-forLv100-assassin")).toHaveText("1Lv");
});

test("狭い画面と文字拡大でもヘルプ本文をスクロールして閉じられる", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 320 });
  await page.goto("/#/");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  const helpButton = page.getByRole("button", { name: "育成計画の使い方" });
  await helpButton.click();
  const dialog = page.getByRole("dialog", { name: "育成計画の使い方" });
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  await dialog.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect(await dialog.evaluate((element) => element.scrollTop)).toBeGreaterThan(
    0,
  );
  await dialog.getByRole("button", { name: "閉じる" }).click();
  await expect(helpButton).toBeFocused();
});
