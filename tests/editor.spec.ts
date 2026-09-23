import { expect, test } from "@playwright/test";
import { touchDrag } from "./helpers/touchDrag";

test("育成経路をドラッグとボタンで編集し、切り替え後も保持する", async ({
  page,
}) => {
  await page.goto("/#/");
  await expect(page.getByRole("heading", { name: "育成計画" })).toBeVisible();
  await page.getByRole("button", { name: "Lv11～100 (0/90)" }).click();

  await page
    .getByTestId("palette-fighter")
    .getByRole("button", { name: "fighter 10 件をドラッグまたは選択" })
    .dragTo(page.getByTestId("range-forLv100"), { steps: 12 });
  await expect(page.getByTestId("capacity-forLv100")).toHaveText("10/90");

  await page
    .getByRole("button", {
      name: "forLv100 の fighter 1 件をドラッグまたは選択",
    })
    .dragTo(page.getByTestId("palette-assassin"), { steps: 12 });
  await expect(page.getByTestId("count-forLv100-fighter")).toHaveText("9 件");
  await expect(page.getByTestId("count-forLv100-assassin")).toHaveText("1 件");

  await page.getByRole("button", { name: "Lv2～10 (0/9)" }).click();
  await expect(page.getByTestId("palette-assassin")).toHaveCount(0);
  await page.getByRole("button", { name: "Lv11～100 (10/90)" }).click();
  await expect(page.getByTestId("count-forLv100-assassin")).toHaveText("1 件");

  await page.getByRole("radio", { name: "LL", exact: true }).check();
  await expect(
    page.getByRole("radio", { name: "LL", exact: true }),
  ).toBeChecked();
  await page
    .getByTestId("stack-forLv100-assassin")
    .getByRole("button", { name: "1 件削除" })
    .click();
  await expect(page.getByTestId("capacity-forLv100")).toHaveText("9/90");
});

test.describe("狭い画面", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("追加ボタンで上限まで編集でき、体格と経路を保つ", async ({ page }) => {
    await page.goto("/#/");
    await page.getByRole("button", { name: "Lv2～10 (0/9)" }).click();
    await page
      .getByTestId("palette-mage")
      .getByRole("button", { name: "mage 10 件をドラッグまたは選択" })
      .click();
    await page
      .getByTestId("range-forLv10")
      .getByRole("button", { name: "選択を追加" })
      .click();
    await expect(page.getByTestId("capacity-forLv10")).toHaveText("9/9");
    await page.getByRole("radio", { name: "SS", exact: true }).check();
    await page.getByRole("button", { name: "Lv1～1 (0/1)" }).click();
    await page.getByRole("button", { name: "Lv2～10 (9/9)" }).click();
    await expect(page.getByTestId("count-forLv10-mage")).toHaveText("9 件");
    await expect(
      page.getByRole("radio", { name: "SS", exact: true }),
    ).toBeChecked();
  });

  test("実画面で指による追加ができる", async ({ page, context }) => {
    await page.goto("/#/");
    await page.evaluate(() => window.scrollTo(0, 380));
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await touchDrag(
      page,
      context,
      page.getByTestId("palette-fighter").getByRole("button", {
        name: "fighter 1 件をドラッグまたは選択",
        exact: true,
      }),
      page.getByTestId("range-onlyLv1"),
    );
    await expect(page.getByTestId("capacity-onlyLv1")).toHaveText("1/1");
    expect(
      Math.abs((await page.evaluate(() => window.scrollY)) - scrollBefore),
    ).toBeLessThan(50);
  });
});
