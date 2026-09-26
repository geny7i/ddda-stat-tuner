import { expect, test } from "@playwright/test";

test("ポーンのドラッグ追加・入れ替えと初期区間の制限", async ({ page }) => {
  await page.goto("/#/");
  await page.getByRole("radio", { name: "ポーン", exact: true }).click();
  await page.getByRole("button", { name: "Lv11～100 (0/90)" }).click();
  await page
    .getByTestId("palette-fighter")
    .getByRole("button", { name: "fighter 10Lvをドラッグまたは選択" })
    .dragTo(page.getByTestId("range-forLv100"), { steps: 12 });
  await expect(page.getByTestId("count-forLv100-fighter")).toHaveText("10Lv");
  await page
    .getByRole("button", { name: "forLv100 の fighter 入替対象に指定" })
    .dragTo(page.getByTestId("palette-warrior"), { steps: 12 });
  await expect(page.getByTestId("count-forLv100-warrior")).toHaveText("1Lv");
  await expect(page.getByTestId("count-forLv100-fighter")).toHaveText("9Lv");
  await page.getByRole("button", { name: "Lv2～10 (0/9)" }).click();
  await expect(page.getByTestId("palette-warrior")).toHaveCount(0);
  await expect(page.locator('[data-testid^="palette-"]')).toHaveCount(3);
});

for (const width of [1280, 390]) {
  test(`${width}px: 種別切り替えの確認・取消・リセットと職業制限`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/#/restore?c=1-ll-z-z9-t5a-u64");
    await expect(page.getByText("Lv 200", { exact: true })).toBeVisible();
    const arisen = page.getByRole("radio", { name: "覚者", exact: true });
    const pawn = page.getByRole("radio", { name: "ポーン", exact: true });
    await expect(arisen).toBeChecked();
    await page.getByRole("checkbox", { name: "HP", exact: true }).uncheck();
    await page.getByRole("button", { name: "Lv11～100 (90/90)" }).click();
    await page
      .getByTestId("palette-assassin")
      .getByRole("button", {
        name: "assassin 1Lvをドラッグまたは選択",
        exact: true,
      })
      .click();
    await pawn.click();
    const dialog = page.getByRole("dialog", {
      name: "職業入力をリセットしますか？",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("すべてのレベル帯の職業入力がリセット");
    await expect(
      dialog.getByRole("button", { name: "キャンセル" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(pawn).toBeFocused();
    await expect(arisen).toBeChecked();
    await expect(page.getByText("Lv 200", { exact: true })).toBeVisible();
    await pawn.press("Space");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "キャンセル" }).click();
    await expect(arisen).toBeChecked();
    await pawn.click();
    await dialog
      .getByRole("button", { name: "リセットして切り替える" })
      .click();
    await expect(pawn).toBeChecked();
    await expect(pawn).toBeFocused();
    await expect(page.getByText("Lv 0", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("radio", { name: "LL", exact: true }),
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "HP", exact: true }),
    ).not.toBeChecked();
    await expect(
      page.getByRole("button", { name: "選択を追加" }),
    ).toBeDisabled();
    await expect(page.getByTestId("capacity-onlyLv1")).toHaveText("0/1");
    await page.getByRole("button", { name: "Lv11～100 (0/90)" }).click();
    for (const job of ["assassin", "magick_archer", "mystic_knight"])
      await expect(page.getByTestId(`palette-${job}`)).toHaveCount(0);
    await page
      .getByTestId("palette-warrior")
      .getByRole("button", {
        name: "warrior 10Lvをドラッグまたは選択",
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "選択を追加" }).click();
    await expect(page.getByTestId("count-forLv100-warrior")).toHaveText("10Lv");
    await arisen.click();
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("button", { name: "リセットして切り替える" })
      .click();
    await expect(page.getByText("Lv 0", { exact: true })).toBeVisible();
    await pawn.click();
    await expect(pawn).toBeChecked();
    await expect(dialog).not.toBeVisible();
    await pawn.click();
    await expect(dialog).not.toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("ポーンの10倍数条件・上限表示を更新し、調整後に種別ごと共有・復元できる", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/");
  await page.getByRole("radio", { name: "ポーン", exact: true }).click();
  await page.getByRole("combobox", { name: "調整の種類" }).selectOption("atk");
  await page.getByRole("button", { name: "自動調整を実行" }).click();
  await page.getByRole("button", { name: "Lv11～100 (90/90)" }).click();
  await expect(page.getByTestId("count-forLv100-warrior")).toHaveText("90Lv");
  const select = page.getByRole("combobox", { name: "調整の種類" });
  const execute = page.getByRole("button", { name: "自動調整を実行" });
  await select.selectOption("round-10");
  await expect(execute).toBeDisabled();
  await expect(execute).toHaveAccessibleDescription(/現在は0回/);
  await expect(page.getByText("変更対象: 最大23Lv")).toBeVisible();
  await select.selectOption("round-5");
  await expect(execute).toBeEnabled();
  await expect(page.getByText("変更対象: 最大12Lv")).toBeVisible();
  await execute.click();
  await expect(
    page.getByRole("table", { name: "調整前後のステータスとスコア" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "LL", exact: true }).click();
  await expect(
    page.getByRole("table", { name: "調整前後のステータスとスコア" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Lv2～10 (9/9)" }).click();
  await page
    .getByRole("button", { name: "forLv10 の fighter 入替対象に指定" })
    .click();
  await page
    .getByTestId("palette-mage")
    .getByRole("button", { name: "1Lv入替" })
    .click();
  await select.selectOption("round-10");
  await expect(execute).toBeEnabled();
  await execute.click();
  await expect(
    page.getByRole("table", { name: "調整前後のステータスとスコア" }),
  ).toBeVisible();
  const values = await page
    .locator('[data-testid^="current-"]')
    .allTextContents();
  expect(values.every((value) => Number(value) % 10 === 0)).toBe(true);
  await page.getByRole("button", { name: "共有 URL をコピー" }).click();
  await expect(page.getByText("コピーしました。")).toBeVisible();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain("c=2-pawn-ll-");
  await page.goto(url);
  await expect(
    page.getByRole("radio", { name: "ポーン", exact: true }),
  ).toBeChecked();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.locator('[data-testid^="current-"]').allTextContents(),
  ).toEqual(values);
  await page.getByRole("button", { name: "Lv2～10 (9/9)" }).click();
  await expect(page.getByTestId("count-forLv10-mage")).toHaveText("1Lv");
  await page.getByRole("button", { name: "Lv11～100 (90/90)" }).click();
  await page
    .getByRole("navigation", { name: "メインメニュー" })
    .getByRole("link", { name: "使い方" })
    .click();
  await expect(
    page.getByRole("heading", { name: "使い方", level: 1 }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "育成計画へ戻る", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("radio", { name: "ポーン", exact: true }),
  ).toBeChecked();
  await expect(page.locator(".comparison-card")).toHaveCount(6);
  expect(
    await page.locator('[data-testid^="current-"]').allTextContents(),
  ).toEqual(values);
});

test("狭い画面・文字拡大でも種別確認をスクロールし、フォーカスを閉じ込めて取消できる", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/restore?c=1-ll-z-z9-t5a-u64");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  const pawn = page.getByRole("radio", { name: "ポーン", exact: true });
  await pawn.click();
  const dialog = page.getByRole("dialog", {
    name: "職業入力をリセットしますか？",
  });
  const cancel = dialog.getByRole("button", { name: "キャンセル" });
  const confirm = dialog.getByRole("button", {
    name: "リセットして切り替える",
  });
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(confirm).toBeFocused();
  await page.keyboard.press("Tab");
  expect(
    await dialog.evaluate((element) => {
      const active = document.activeElement;
      return (
        active instanceof HTMLElement &&
        active.matches("button, input, select, textarea, a") &&
        !element.contains(active)
      );
    }),
  ).toBe(false);
  expect(
    await dialog.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  await dialog.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect(await dialog.evaluate((element) => element.scrollTop)).toBeGreaterThan(
    0,
  );
  await cancel.click();
  await expect(dialog).not.toBeVisible();
  await expect(pawn).toBeFocused();
  await expect(
    page.getByRole("radio", { name: "覚者", exact: true }),
  ).toBeChecked();
  await expect(page.getByText("Lv 200", { exact: true })).toBeVisible();
});

test("不正なポーン共有コードは現在の計画を維持し、旧コードは覚者に復元する", async ({
  page,
}) => {
  await page.goto("/#/restore?c=2-pawn-l-z-xz8-w5a-w64");
  await expect(
    page.getByRole("radio", { name: "ポーン", exact: true }),
  ).toBeChecked();
  const values = await page
    .locator('[data-testid^="current-"]')
    .allTextContents();
  await page.evaluate(() => {
    location.hash = "/restore?c=2-pawn-m---t-";
  });
  await expect(page.getByRole("alert")).toContainText(
    "ポーンでは選択できない職業",
  );
  await page.getByRole("link", { name: "育成計画へ戻る" }).click();
  await expect(
    page.getByRole("radio", { name: "ポーン", exact: true }),
  ).toBeChecked();
  expect(
    await page.locator('[data-testid^="current-"]').allTextContents(),
  ).toEqual(values);
  await page.evaluate(() => {
    location.hash = "/restore?c=1-m-z-z9-t5a-u64";
  });
  await expect(
    page.getByRole("radio", { name: "覚者", exact: true }),
  ).toBeChecked();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Lv11～100 (90/90)" }).click();
  await expect(page.getByTestId("count-forLv100-assassin")).toHaveText("90Lv");
});
