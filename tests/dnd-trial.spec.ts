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
  await expect(target).toHaveClass(/trial-target/);
  await page.keyboard.press("Space");
}

test("マウスで ×10 を追加し、配置済みの職業を変更できる", async ({ page }) => {
  await page.goto("/#/dnd-trial");
  await expect(
    page.getByRole("heading", { name: "ドラッグ操作の試運転" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "fighter 10 件をドラッグまたは選択" })
    .dragTo(page.getByTestId("range-forLv10"), { steps: 12 });
  await expect(page.getByTestId("capacity-forLv10")).toHaveText("9/9");
  await expect(page.getByTestId("update-count")).toHaveText("更新回数: 1");

  await page
    .getByTestId("palette-fighter")
    .getByRole("button", {
      name: "fighter 1 件をドラッグまたは選択",
      exact: true,
    })
    .dragTo(page.getByTestId("range-forLv100"), { steps: 12 });
  await page
    .getByTestId("palette-mage")
    .getByRole("button", { name: "mage 1 件をドラッグまたは選択", exact: true })
    .dragTo(page.getByTestId("range-forLv100"), { steps: 12 });
  await expect(page.getByTestId("capacity-forLv100")).toHaveText("2/90");

  await page
    .getByRole("button", {
      name: "forLv100 の fighter 1 件をドラッグまたは選択",
      exact: true,
    })
    .dragTo(page.getByTestId("stack-forLv100-mage"), { steps: 12 });
  await expect(page.getByTestId("count-forLv100-mage")).toHaveText("2 件");
  await expect(page.getByTestId("stack-forLv100-fighter")).toHaveCount(0);
  await expect(page.getByTestId("update-count")).toHaveText("更新回数: 4");
});

test("キーボードで追加・変更し、Escape で中止できる", async ({ page }) => {
  await page.goto("/#/dnd-trial");
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
    .getByRole("button", { name: "mage 1 件をドラッグまたは選択", exact: true })
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

  const beforeCancel = await page.getByTestId("update-count").textContent();
  await page
    .getByTestId("palette-fighter")
    .getByRole("button", {
      name: "fighter 1 件をドラッグまたは選択",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("update-count")).toHaveText(beforeCancel ?? "");
});

test("ボタンだけでも追加・変更・削除でき、無効な帯は選べない", async ({
  page,
}) => {
  await page.goto("/#/dnd-trial");
  await page
    .getByTestId("palette-fighter")
    .getByRole("button", {
      name: "fighter 1 件をドラッグまたは選択",
      exact: true,
    })
    .click();
  await page
    .getByTestId("range-forLv100")
    .getByRole("button", { name: "選択を追加" })
    .click();
  await page
    .getByTestId("palette-mage")
    .getByRole("button", { name: "mage 1 件をドラッグまたは選択", exact: true })
    .click();
  await page
    .getByTestId("range-forLv100")
    .getByRole("button", { name: "選択を追加" })
    .click();
  await page
    .getByTestId("stack-forLv100-fighter")
    .getByRole("button", {
      name: "forLv100 の fighter 1 件をドラッグまたは選択",
      exact: true,
    })
    .click();
  await page
    .getByTestId("stack-forLv100-mage")
    .getByRole("button", { name: "ここへ変更" })
    .click();
  await expect(page.getByTestId("count-forLv100-mage")).toHaveText("2 件");
  await page
    .getByTestId("stack-forLv100-mage")
    .getByRole("button", { name: "1 件削除" })
    .click();
  await expect(page.getByTestId("count-forLv100-mage")).toHaveText("1 件");

  await page
    .getByTestId("palette-assassin")
    .getByRole("button", {
      name: "assassin 1 件をドラッグまたは選択",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByTestId("range-forLv10")
      .getByRole("button", { name: "選択を追加" }),
  ).toBeDisabled();
  await expect(page.getByTestId("update-count")).toHaveText("更新回数: 4");
});

test("無効なドロップを拒否し、×100 はレベル帯の上限で止まる", async ({
  page,
}) => {
  await page.goto("/#/dnd-trial");
  await page
    .getByTestId("palette-assassin")
    .getByRole("button", {
      name: "assassin 1 件をドラッグまたは選択",
      exact: true,
    })
    .dragTo(page.getByTestId("range-forLv10"), { steps: 12 });
  await expect(page.getByTestId("capacity-forLv10")).toHaveText("0/9");
  await expect(page.getByTestId("update-count")).toHaveText("更新回数: 0");

  await page
    .getByTestId("palette-fighter")
    .getByRole("button", { name: "fighter 100 件をドラッグまたは選択" })
    .dragTo(page.getByTestId("range-forLv100"), { steps: 12 });
  await expect(page.getByTestId("capacity-forLv100")).toHaveText("90/90");
  await expect(page.getByTestId("update-count")).toHaveText("更新回数: 1");
  await page
    .getByTestId("palette-mage")
    .getByRole("button", { name: "mage 1 件をドラッグまたは選択" })
    .dragTo(page.getByTestId("range-forLv100"), { steps: 12 });
  await expect(page.getByTestId("capacity-forLv100")).toHaveText("90/90");
  await expect(page.getByTestId("update-count")).toHaveText("更新回数: 1");
});

test.describe("タッチ操作", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("指で職業をレベル帯へ追加できる", async ({ page, context }) => {
    await page.goto("/#/dnd-trial");
    const source = page.getByTestId("palette-fighter").getByRole("button", {
      name: "fighter 1 件をドラッグまたは選択",
      exact: true,
    });
    const target = page.getByTestId("range-onlyLv1");
    await touchDrag(page, context, source, target);
    await expect(page.getByTestId("capacity-onlyLv1")).toHaveText("1/1");
    await expect(page.getByTestId("update-count")).toHaveText("更新回数: 1");
  });

  test("指で配置済みの職業を変更できる", async ({ page, context }) => {
    await page.goto("/#/dnd-trial");
    for (const vocation of ["fighter", "mage"]) {
      await page
        .getByTestId(`palette-${vocation}`)
        .getByRole("button", {
          name: `${vocation} 1 件をドラッグまたは選択`,
          exact: true,
        })
        .click();
      await page
        .getByTestId("range-forLv100")
        .getByRole("button", { name: "選択を追加" })
        .click();
    }
    const source = page.getByRole("button", {
      name: "forLv100 の fighter 1 件をドラッグまたは選択",
      exact: true,
    });
    const target = page.getByTestId("stack-forLv100-mage");
    await target.scrollIntoViewIfNeeded();
    await touchDrag(page, context, source, target);
    await expect(page.getByTestId("count-forLv100-mage")).toHaveText("2 件");
    await expect(page.getByTestId("update-count")).toHaveText("更新回数: 3");
  });
});
