import { expect, test } from "@playwright/test";

test("経路・体格・注目項目の変更をステータスと比較表へ反映する", async ({
  page,
}) => {
  await page.goto("/#/");
  await expect(page.getByTestId("current-st")).toHaveText("40");

  await page
    .getByTestId("palette-fighter")
    .getByRole("button", {
      name: "fighter 1 件をドラッグまたは選択",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "選択を追加" }).click();
  await expect(page.getByText("Lv 1")).toBeVisible();
  await expect(page.getByTestId("current-hp")).toHaveText("450");
  await expect(page.getByTestId("current-st")).toHaveText("540");

  await page.getByRole("radio", { name: "LL", exact: true }).check();
  await expect(page.getByTestId("current-st")).toHaveText("580");
  await page.getByRole("button", { name: "Lv11～100 (0/90)" }).click();

  for (const label of ["HP", "ST", "魔法攻撃", "物理防御", "魔法防御"])
    await page.getByRole("checkbox", { name: label }).uncheck();

  await expect(page.locator("tbody tr").first()).toContainText("assassin");
  await expect(page.getByTestId("score-assassin")).toHaveText("6");
  await expect(page.getByTestId("score-warrior")).toHaveText("5");
});
