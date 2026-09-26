import { expect, test, type Page } from "@playwright/test";

const scoreId = "help-スコアについて";
const roundingId = "help-ステータスの510の倍数への調整について";
const sectionUrl = (id: string) =>
  `./#/help?${new URLSearchParams({ section: id })}`;

for (const width of [1280, 390]) {
  test(`${width}px: メニューとタイトル横のリンクから同じ使い方ページを開く`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("./#/");
    const menu = page.getByRole("navigation", { name: "メインメニュー" });
    await expect(menu.getByRole("link")).toHaveText([
      "育成計画",
      "使い方",
      "免責事項",
    ]);
    await menu.getByRole("link", { name: "使い方" }).click();
    await expect(page).toHaveURL(/#\/help$/);
    await expect(
      page.getByRole("heading", { name: "使い方", level: 1 }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "育成計画へ戻る", exact: true })
      .first()
      .click();
    const help = page
      .locator(".editor-title-row")
      .getByRole("link", { name: "使い方" });
    await help.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#\/help$/);
    await expect(
      page.getByRole("heading", { name: "使い方", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page
      .getByRole("navigation", { name: "目次" })
      .getByRole("link", { name: "スコアについて", exact: true })
      .click();
    await expectSection(page, scoreId);
  });
}

async function expectSection(page: Page, id: string) {
  const heading = page.locator(`[id="${id}"]`);
  await expect(heading).toBeFocused();
  await expect
    .poll(async () => {
      const box = await heading.boundingBox();
      return box !== null && box.y >= 0 && box.y < 100;
    })
    .toBe(true);
  expect(new URL(page.url()).hash).toBe(
    `#/help?${new URLSearchParams({ section: id })}`,
  );
}

test("使い方の本文、目次、サンプル画像と戻るリンクを表示する", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./#/help");
  await expect(
    page.getByRole("heading", { level: 1, name: "使い方" }),
  ).toBeVisible();
  const toc = page.getByRole("navigation", { name: "目次" });
  await expect(toc.getByRole("link")).toHaveCount(4);
  await expect(page.locator(".help-body")).toContainText("1Lv入替");
  await expect(page.locator(".help-body")).toContainText(
    "score = HP / 10 + ST / 10",
  );
  await expect(page.getByRole("table")).toContainText("23Lv");
  const image = page.getByRole("img", { name: /育成計画で職業を追加し/ });
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate(
        (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
      ),
    )
    .toBe(true);
  const imageUrl = await image.getAttribute("src");
  const base = new URL(test.info().project.use.baseURL!);
  expect(imageUrl).toBe(`${base.pathname}help/images/editor-example.png`);
  expect(errors).toEqual([]);
  await page
    .getByRole("link", { name: "育成計画へ戻る", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "育成計画" }),
  ).toBeVisible();
});

test("目次と本文の節リンクで移動し、再読み込み・履歴移動・再選択もできる", async ({
  page,
}) => {
  await page.goto("./#/help");
  const toc = page.getByRole("navigation", { name: "目次" });
  await toc.getByRole("link", { name: "スコアについて", exact: true }).click();
  await expectSection(page, scoreId);
  await toc
    .getByRole("link", {
      name: "ステータスの5,10の倍数への調整について",
      exact: true,
    })
    .click();
  await expectSection(page, roundingId);
  await page.goBack();
  await expectSection(page, scoreId);
  await page.goForward();
  await expectSection(page, roundingId);
  await page.reload();
  await expectSection(page, roundingId);
  await page.evaluate(() => window.scrollTo(0, 0));
  await toc
    .getByRole("link", {
      name: "ステータスの5,10の倍数への調整について",
      exact: true,
    })
    .click();
  await expectSection(page, roundingId);
  await page
    .locator(".help-body")
    .getByRole("link", { name: "スコアについて", exact: true })
    .click();
  await expectSection(page, scoreId);
});

test("節URLを直接開け、未知の節IDでもページを表示する", async ({ page }) => {
  await page.goto(sectionUrl(scoreId));
  await expectSection(page, scoreId);
  await page.goto(sectionUrl("unknown"));
  await expect(
    page.getByRole("heading", { level: 1, name: "使い方" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "目次" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "育成計画の使い方", exact: true }),
  ).toBeVisible();
  await page.goto(sectionUrl(roundingId));
  await expectSection(page, roundingId);
  await page.goto("./#/help");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test("キーボードで目次から本文へフォーカスを移す", async ({ page }) => {
  await page.goto("./#/help");
  const link = page
    .getByRole("navigation", { name: "目次" })
    .getByRole("link", { name: "スコアについて", exact: true });
  await link.focus();
  await page.keyboard.press("Enter");
  await expectSection(page, scoreId);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "育成計画へ戻る", exact: true }).nth(1),
  ).toBeFocused();
});

test("390px幅・文字拡大でも画像と本文が画面幅に収まる", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./#/help");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  const toc = page.getByRole("navigation", { name: "目次" });
  const body = page.locator(".help-body");
  const tocBox = await toc.boundingBox();
  const bodyBox = await body.boundingBox();
  expect(tocBox!.y + tocBox!.height).toBeLessThan(bodyBox!.y);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const imageBox = await page
    .getByRole("img", { name: /育成計画で職業を追加し/ })
    .boundingBox();
  expect(imageBox!.width).toBeLessThanOrEqual(bodyBox!.width);
  await toc.getByRole("link", { name: "スコアについて", exact: true }).click();
  await expectSection(page, scoreId);
});
