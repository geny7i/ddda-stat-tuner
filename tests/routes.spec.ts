import { expect, test } from "@playwright/test";

test("ハッシュ経路を直接開き、再読み込みできる", async ({ page }) => {
  await page.goto("/#/chart");
  await expect(
    page.getByRole("heading", { name: "職業比較チャート" }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "職業比較チャート" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "免責事項" }).click();
  await expect(page).toHaveURL(/#\/disclaimer$/);
  await expect(page.getByRole("heading", { name: "免責事項" })).toBeVisible();
});

test("存在しない経路から育成計画へ戻れる", async ({ page }) => {
  await page.goto("/#/unknown");
  await expect(
    page.getByRole("heading", { name: "ページが見つかりません" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "育成計画へ戻る" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { name: "育成経路" })).toBeVisible();
});
