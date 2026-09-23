import { expect, test } from "@playwright/test";

test("自動調整からチャート・共有・復元まで同じ育成経路を保つ", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/#/");
  await page.getByRole("radio", { name: "LL", exact: true }).check();

  await page
    .getByTestId("palette-fighter")
    .getByRole("button", { name: "fighter 1 件をドラッグまたは選択" })
    .click();
  await page.getByRole("button", { name: "選択を追加" }).click();
  await page.getByRole("button", { name: "Lv2～10 (0/9)" }).click();
  await page
    .getByTestId("palette-mage")
    .getByRole("button", { name: "mage 1 件をドラッグまたは選択" })
    .click();
  await page.getByRole("button", { name: "選択を追加" }).click();

  const select = page.getByRole("combobox", { name: "調整の種類" });
  await select.selectOption("matk");
  await expect(page.locator("#adjustment-description")).toContainText(
    "未選択のレベルだけを対象に、魔法攻撃の成長値が最大",
  );
  await expect(page.locator("#adjustment-description")).toContainText(
    "すでに選んだ職業は変更しません",
  );
  await expect(page.getByText("変更対象: 198 レベル")).toBeVisible();
  await page.getByRole("button", { name: "自動調整を実行" }).click();

  await expect(page.locator(".adjustment-result")).toContainText(
    "「魔法攻撃 特化で未選択レベルを埋める」を実行し、198 レベルを追加",
  );
  await expect(
    page.getByRole("button", { name: "自動調整を実行" }),
  ).toBeDisabled();
  await expect(page.getByText("Lv 200")).toBeVisible();
  await expect(page.locator("#range-breakdown-onlyLv1")).toHaveText(
    "fighter 1件",
  );
  await expect(page.locator("#range-breakdown-forLv10")).toHaveText("mage 9件");
  await expect(page.locator("#range-breakdown-forLv100")).toHaveText(
    "sorcerer 90件",
  );
  await expect(page.locator("#range-breakdown-forLv200")).toHaveText(
    "sorcerer 100件",
  );
  await page.getByRole("button", { name: "Lv11～100 (90/90)" }).click();
  await expect(page.getByTestId("count-forLv100-sorcerer")).toHaveText("90 件");
  await expect(page.getByTestId("comparison-sorcerer")).toBeVisible();

  await page.getByRole("link", { name: "チャート" }).click();
  await expect(page.getByText("Lv 200")).toBeVisible();
  await expect(page.getByRole("meter")).toHaveCount(9);
  await expect(page.locator("#range-breakdown-forLv100")).toHaveText(
    "sorcerer 90件",
  );
  await page.getByRole("button", { name: "共有 URL をコピー" }).click();
  const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(shareUrl).toContain("/#/restore?c=1-ll-z-x9-u5a-u64");

  await page.goto(shareUrl);
  await expect(page.getByText("Lv 200")).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "LL", exact: true }),
  ).toBeChecked();
  await expect(page.locator("#range-breakdown-forLv100")).toHaveText(
    "sorcerer 90件",
  );
  await expect(
    page.getByRole("button", { name: "自動調整を実行" }),
  ).toBeDisabled();
});

test.describe("狭い画面", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("説明を確認し、キーボードで調整を実行できる", async ({ page }) => {
    await page.goto("/#/");
    const select = page.getByRole("combobox", { name: "調整の種類" });
    await select.selectOption("mdef");
    await select.focus();
    await expect(select).toBeFocused();
    await expect(select).toHaveValue("mdef");
    await expect(page.locator("#adjustment-description")).toContainText(
      "魔法防御の成長値が最大",
    );
    await page.keyboard.press("Tab");
    const button = page.getByRole("button", { name: "自動調整を実行" });
    await expect(button).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator(".adjustment-result")).toContainText(
      "200 レベルを追加",
    );
    await expect(button).toBeDisabled();
    await expect(page.getByText("Lv 200")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  });
});
