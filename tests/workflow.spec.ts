import { expect, test } from "@playwright/test";

test("育成経路の作成から共有・復元・比較まで一連の操作を完了できる", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/#/");

  await page.getByRole("radio", { name: "LL", exact: true }).check();
  await page
    .getByTestId("palette-fighter")
    .getByRole("button", {
      name: "fighter 1 件をドラッグまたは選択",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "選択を追加" }).click();
  await page.getByRole("button", { name: "Lv2～10 (0/9)" }).click();
  await page
    .getByTestId("palette-mage")
    .getByRole("button", { name: "mage 10 件をドラッグまたは選択" })
    .click();
  await page.getByRole("button", { name: "選択を追加" }).click();
  await expect(page.getByText("Lv 10")).toBeVisible();
  await expect(page.getByTestId("current-hp")).toHaveText("648");

  await page.getByRole("link", { name: "チャート" }).click();
  await expect(page.getByRole("meter")).toHaveCount(3);
  await page.getByRole("checkbox", { name: "HP" }).uncheck();
  await page.getByRole("button", { name: "共有 URL をコピー" }).click();
  const shareUrl = await page.evaluate(() => navigator.clipboard.readText());

  await page.goto(shareUrl);
  await expect(page.getByRole("heading", { name: "育成計画" })).toBeVisible();
  await expect(page.getByText("Lv 10")).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "LL", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Lv2～10 (9/9)" }).click();
  await expect(page.getByTestId("count-forLv10-mage")).toHaveText("9 件");

  await page.getByRole("link", { name: "免責事項" }).click();
  await expect(page.getByRole("heading", { name: "免責事項" })).toBeVisible();
  await page.getByRole("link", { name: "育成計画" }).click();
  await expect(page.getByTestId("current-hp")).toHaveText("648");
});
