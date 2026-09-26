import { expect, test } from "@playwright/test";

test("経路・体格・注目項目の変更をステータスと成長値カードへ反映する", async ({
  page,
}) => {
  await page.goto("/#/");
  await expect(page.getByTestId("current-st")).toHaveText("40");

  await page
    .getByTestId("palette-fighter")
    .getByRole("button", {
      name: "fighter 1Lvをドラッグまたは選択",
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

  await expect(page.locator(".comparison-card").first()).toContainText(
    "assassin",
  );
  await expect(page.getByTestId("score-assassin")).toHaveText("6");
  await expect(page.getByTestId("score-warrior")).toHaveText("5");
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
