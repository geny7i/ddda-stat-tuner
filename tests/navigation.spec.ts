import { expect, test } from "@playwright/test";

test("スキップボタンで経路を変えずに本文へ移動できる", async ({ page }) => {
  await page.goto("/#/chart");
  await page.keyboard.press("Tab");

  const skipButton = page.getByRole("button", { name: "本文へ移動" });
  await expect(skipButton).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page).toHaveURL(/#\/chart$/);
  await expect(
    page.getByRole("heading", { name: "職業比較チャート" }),
  ).toBeVisible();
});

test("画面を往復しても育成経路・レベル帯・注目項目を保持する", async ({
  page,
}) => {
  await page.goto("/#/");
  await page
    .getByTestId("palette-fighter")
    .getByRole("button", {
      name: "fighter 1 件をドラッグまたは選択",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "選択を追加" }).click();
  await page.getByRole("button", { name: "Lv11～100 (0/90)" }).click();
  await page.getByRole("checkbox", { name: "HP" }).uncheck();

  await page.getByRole("link", { name: "チャート" }).click();
  await expect(
    page.getByRole("heading", { name: "職業比較チャート" }),
  ).toBeVisible();
  await expect(page.getByText("Lv 1")).toBeVisible();
  await expect(page.getByTestId("current-hp")).toHaveText("450");
  await expect(page.getByRole("checkbox", { name: "HP" })).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Lv11～100 (0/90)" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("meter")).toHaveCount(9);

  await page.getByRole("link", { name: "免責事項" }).click();
  await expect(page.getByRole("heading", { name: "免責事項" })).toBeVisible();
  await expect(page.getByText(/非公式ツール/)).toBeVisible();
  await page.getByRole("link", { name: "育成計画" }).click();
  await expect(page.getByText("編集中: Lv11～100")).toBeVisible();
  await page.getByRole("button", { name: "Lv1～1 (1/1)" }).click();
  await expect(page.getByTestId("count-onlyLv1-fighter")).toHaveText("1 件");
  await expect(page.getByRole("checkbox", { name: "HP" })).not.toBeChecked();
});

test.describe("狭い画面のナビゲーション", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("すべての主要画面へ移動できる", async ({ page }) => {
    await page.goto("/#/");
    const nav = page.getByRole("navigation", { name: "メインメニュー" });
    await expect(nav.getByRole("link")).toHaveCount(3);
    await nav.getByRole("link", { name: "チャート" }).click();
    await expect(page.getByRole("meter")).toHaveCount(3);
    await nav.getByRole("link", { name: "免責事項" }).click();
    await expect(
      page.getByRole("heading", { name: "Disclaimer" }),
    ).toBeVisible();
  });
});
