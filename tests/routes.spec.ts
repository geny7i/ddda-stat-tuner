import { expect, test } from "@playwright/test";

test("ハッシュ経路を直接開き、再読み込みできる", async ({ page }) => {
  await page.goto("/#/chart");
  await expect(page.getByRole("heading", { name: "チャート" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "チャート" })).toBeVisible();

  await page.getByRole("link", { name: "免責事項" }).click();
  await expect(page).toHaveURL(/#\/disclaimer$/);
  await expect(page.getByRole("heading", { name: "免責事項" })).toBeVisible();
});
