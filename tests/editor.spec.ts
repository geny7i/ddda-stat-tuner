import { expect, test, type Locator, type Page } from "@playwright/test";
import { touchDrag } from "./helpers/touchDrag";

async function keyboardDrag(page: Page, source: Locator, target: Locator) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox)
    throw new Error("ドラッグ元またはドロップ先が表示されていません。");

  const deltaX =
    targetBox.x + targetBox.width / 2 - sourceBox.x - sourceBox.width / 2;
  const deltaY =
    targetBox.y + targetBox.height / 2 - sourceBox.y - sourceBox.height / 2;
  await source.focus();
  await page.keyboard.press("Space");
  for (const [delta, positive, negative] of [
    [deltaX, "ArrowRight", "ArrowLeft"],
    [deltaY, "ArrowDown", "ArrowUp"],
  ] as const) {
    const key = delta >= 0 ? positive : negative;
    const steps = Math.round(Math.abs(delta) / 20);
    for (let index = 0; index < steps; index += 1)
      await page.keyboard.press(key);
  }
  await expect(target).toHaveClass(/path-target/);
  await page.keyboard.press("Space");
}

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
  await expect(
    page.getByRole("button", { name: "Lv11～100 (10/90)" }),
  ).toHaveAttribute("aria-describedby", "range-breakdown-forLv100");
  await expect(page.locator("#range-breakdown-forLv100")).toHaveText(
    "assassin 1件、fighter 9件",
  );

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

test("キーボードで実画面の追加・変更・中止ができる", async ({ page }) => {
  await page.goto("/#/");
  await page.getByRole("button", { name: "Lv2～10 (0/9)" }).click();
  for (const label of ["HP", "ST", "物理攻撃", "物理防御", "魔法防御"])
    await page.getByRole("checkbox", { name: label }).uncheck();
  await expect(page.locator(".comparison-card").first()).toHaveAttribute(
    "data-testid",
    "comparison-mage",
  );

  await keyboardDrag(
    page,
    page.getByTestId("palette-fighter").getByRole("button", {
      name: "fighter 1 件をドラッグまたは選択",
      exact: true,
    }),
    page.getByTestId("range-forLv10"),
  );
  await expect(page.getByTestId("capacity-forLv10")).toHaveText("1/9");

  await page
    .getByTestId("palette-mage")
    .getByRole("button", {
      name: "mage 1 件をドラッグまたは選択",
      exact: true,
    })
    .click();
  await page
    .getByTestId("range-forLv10")
    .getByRole("button", { name: "選択を追加" })
    .click();
  await keyboardDrag(
    page,
    page.getByRole("button", {
      name: "forLv10 の fighter 1 件をドラッグまたは選択",
      exact: true,
    }),
    page.getByTestId("stack-forLv10-mage"),
  );
  await expect(page.getByTestId("count-forLv10-mage")).toHaveText("2 件");

  const source = page.getByTestId("palette-fighter").getByRole("button", {
    name: "fighter 1 件をドラッグまたは選択",
    exact: true,
  });
  await source.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("capacity-forLv10")).toHaveText("2/9");
});

test("並べ替えた比較行から追加・変更でき、職業と数量が一致する", async ({
  page,
}) => {
  await page.goto("/#/");
  await page.getByRole("button", { name: "Lv11～100 (0/90)" }).click();
  for (const label of ["HP", "ST", "魔法攻撃", "物理防御", "魔法防御"])
    await page.getByRole("checkbox", { name: label }).uncheck();

  await expect(page.locator(".comparison-card").first()).toHaveAttribute(
    "data-testid",
    "comparison-assassin",
  );
  await page.keyboard.press("Tab");
  await expect(
    page.getByTestId("comparison-assassin").getByRole("button", {
      name: "assassin 1 件をドラッグまたは選択",
    }),
  ).toBeFocused();
  await page
    .getByTestId("comparison-assassin")
    .getByRole("button", { name: "assassin 10 件をドラッグまたは選択" })
    .dragTo(page.getByTestId("range-forLv100"), { steps: 12 });
  await expect(page.getByTestId("capacity-forLv100")).toHaveText("10/90");
  await expect(page.getByTestId("count-forLv100-assassin")).toHaveText("10 件");

  await page
    .getByRole("button", {
      name: "forLv100 の assassin 1 件をドラッグまたは選択",
    })
    .dragTo(page.getByTestId("palette-sorcerer"), { steps: 12 });
  await expect(page.getByTestId("count-forLv100-sorcerer")).toHaveText("1 件");

  await page
    .getByRole("button", {
      name: "forLv100 の sorcerer 1 件をドラッグまたは選択",
    })
    .click();
  await page
    .getByTestId("palette-warrior")
    .getByRole("button", { name: "この職業へ変更" })
    .click();
  await expect(page.getByTestId("count-forLv100-warrior")).toHaveText("1 件");
  await expect(page.getByTestId("capacity-forLv100")).toHaveText("10/90");
});

test("広い画面では職業と成長値の右に育成経路を表示する", async ({ page }) => {
  await page.goto("/#/");
  const comparison = await page.locator(".comparison-editable").boundingBox();
  const board = await page
    .getByRole("region", { name: "育成経路" })
    .boundingBox();
  expect(comparison).not.toBeNull();
  expect(board).not.toBeNull();
  expect((comparison?.x ?? 0) + (comparison?.width ?? 0)).toBeLessThan(
    board?.x ?? 0,
  );
  expect(Math.abs((comparison?.y ?? 0) - (board?.y ?? 0))).toBeLessThan(3);
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
    await expect(page.locator("#range-breakdown-forLv10")).toHaveText(
      "mage 9件",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await page.getByRole("radio", { name: "SS", exact: true }).check();
    await page.getByRole("button", { name: "Lv1～1 (0/1)" }).click();
    await page.getByRole("button", { name: "Lv2～10 (9/9)" }).click();
    await expect(page.getByTestId("count-forLv10-mage")).toHaveText("9 件");
    await expect(
      page.getByRole("radio", { name: "SS", exact: true }),
    ).toBeChecked();
  });

  test("9 職業が混在しても各レベル帯の内訳が折り返される", async ({ page }) => {
    await page.goto("/#/restore?c=1-m-z-z9-zyxwvutsr-t64");
    const range = page.getByRole("button", { name: "Lv11～100 (9/90)" });
    await expect(range).toBeVisible();
    await expect(range.locator("img")).toHaveCount(9);
    await expect(page.locator("#range-breakdown-forLv100")).toContainText(
      "mystic_knight 1件",
    );
    await expect(
      page.getByRole("button", { name: "Lv101～200 (100/100)" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  });

  test("職業カード内で成長値を見られ、画面幅に収まる", async ({ page }) => {
    await page.goto("/#/");
    await page.getByRole("button", { name: "Lv11～100 (0/90)" }).click();
    const row = page.getByTestId("comparison-fighter");
    await expect(row.locator(".comparison-card-stats dt")).toHaveText([
      "hp",
      "st",
      "atk",
      "matk",
      "def",
      "mdef",
    ]);
    await expect(
      row.getByRole("button", { name: "fighter 1 件をドラッグまたは選択" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  });

  test("実画面で指による追加ができる", async ({ page, context }) => {
    await page.goto("/#/");
    for (const label of ["HP", "ST", "物理攻撃", "物理防御", "魔法防御"])
      await page.getByRole("checkbox", { name: label }).uncheck();
    await expect(page.locator(".comparison-card").first()).toHaveAttribute(
      "data-testid",
      "comparison-mage",
    );
    await page.getByTestId("range-onlyLv1").scrollIntoViewIfNeeded();
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
