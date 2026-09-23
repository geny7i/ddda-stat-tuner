import { expect, test } from "@playwright/test";

test("共有 URL をコピーし、同じ経路と体格を復元できる", async ({
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

  await page.getByRole("button", { name: "共有 URL をコピー" }).click();
  await expect(page.getByText("コピーしました。")).toBeVisible();
  const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(shareUrl).toMatch(/\/#\/restore\?c=1-ll-z-x9--$/);

  await page.goto(shareUrl);
  await expect(page.getByRole("heading", { name: "育成計画" })).toBeVisible();
  await expect(page.getByText("Lv 10")).toBeVisible();
  await expect(page.getByTestId("current-hp")).toHaveText("648");
  await expect(page.getByTestId("current-st")).toHaveText("760");
  await expect(
    page.getByRole("radio", { name: "LL", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Lv2～10 (9/9)" }).click();
  await expect(page.getByTestId("count-forLv10-mage")).toHaveText("9 件");

  await page.goto(shareUrl);
  await expect(page.getByText("Lv 10")).toBeVisible();
  await expect(page.getByTestId("current-matk")).toHaveText("96");
});

test("不正または欠けた復元コードを画面に表示し、育成計画へ戻れる", async ({
  page,
}) => {
  await page.goto("/#/restore?c=1-m--t--");
  await expect(
    page.getByRole("heading", { name: "復元できませんでした" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "forLv10 に選択できない職業",
  );
  await page.getByRole("link", { name: "育成計画へ戻る" }).click();
  await expect(page.getByRole("heading", { name: "育成計画" })).toBeVisible();

  await page.goto("/#/restore");
  await expect(page.getByRole("alert")).toContainText(
    "復元コードが指定されていません",
  );
});

test("既存のスラッシュなし共有 URL も読み込める", async ({ page }) => {
  await page.goto("/#restore?c=1-ll-z-z9-t5a-u64");
  await expect(page.getByRole("heading", { name: "育成計画" })).toBeVisible();
  await expect(page.getByText("Lv 200")).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "LL", exact: true }),
  ).toBeChecked();
});
