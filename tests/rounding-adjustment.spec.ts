import { expect, test } from "@playwright/test";
import {
  LEVEL_RANGES,
  serializeCharacter,
  STAT_IDS,
  type CharacterInfo,
  type VocationPath,
} from "../src/domain";

function mixedCharacter(): CharacterInfo {
  const entries = LEVEL_RANGES.map((range) => [
    range.id,
    Array.from(
      { length: range.to - range.from + 1 },
      (_, index) =>
        range.availableVocationIds[index % range.availableVocationIds.length],
    ),
  ]);
  return {
    vocationPath: Object.fromEntries(entries) as unknown as VocationPath,
    weightClass: "m",
  };
}

test("倍数調整は200Lv入力済みの場合だけ実行できる", async ({ page }) => {
  await page.goto("/#/");
  const select = page.getByRole("combobox", { name: "調整の種類" });
  await select.selectOption("round-5");
  await expect(page.locator("#adjustment-description")).toContainText(
    "全200Lvの選択後に実行できます",
  );
  await expect(
    page.getByText("実行には残り200Lvの選択が必要です。"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "自動調整を実行" }),
  ).toBeDisabled();

  await select.selectOption("hp");
  await expect(
    page.getByRole("button", { name: "自動調整を実行" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "自動調整を実行" }).click();
  await select.selectOption("round-5");
  await expect(
    page.getByRole("button", { name: "自動調整を実行" }),
  ).toBeEnabled();
});

for (const multiple of [5, 10] as const) {
  test(`${multiple}の倍数調整後も共有・復元で同じステータスになる`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const code = serializeCharacter(mixedCharacter());
    await page.goto(`/#/restore?c=${code}`);
    await expect(page.getByText("Lv 200")).toBeVisible();
    const select = page.getByRole("combobox", { name: "調整の種類" });
    await select.selectOption(`round-${multiple}`);
    await page.getByRole("button", { name: "自動調整を実行" }).click();
    await expect(page.locator(".adjustment-result")).toContainText(
      `全ステータスを${multiple}の倍数に調整し`,
    );
    await expect(
      page.getByRole("table", { name: "調整前後のステータスとスコア" }),
    ).toBeVisible();
    const values: Record<string, string> = {};
    for (const id of STAT_IDS) {
      const value = await page.getByTestId(`current-${id}`).textContent();
      expect(Number(value) % multiple).toBe(0);
      values[id] = value ?? "";
    }

    await page.getByRole("button", { name: "共有 URL をコピー" }).click();
    const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
    await page.goto(shareUrl);
    for (const id of STAT_IDS) {
      await expect(page.getByTestId(`current-${id}`)).toHaveText(values[id]);
    }
    await page.getByRole("link", { name: "チャート" }).click();
    await expect(page.getByText("Lv 200")).toBeVisible();
  });
}

test("狭い画面でも倍数調整の説明と結果を読める", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/#/restore?c=${serializeCharacter(mixedCharacter())}`);
  await page
    .getByRole("combobox", { name: "調整の種類" })
    .selectOption("round-10");
  const button = page.getByRole("button", { name: "自動調整を実行" });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".adjustment-result")).toContainText(
    "10の倍数に調整し",
  );
  await expect(
    page.getByRole("table", { name: "調整前後のステータスとスコア" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("探索範囲で見つからない場合は経路を変更しない", async ({ page }) => {
  await page.goto("/#/restore?c=1-m-z-z9-z5a-z64");
  const before = await page.getByTestId("current-hp").textContent();
  await page
    .getByRole("combobox", { name: "調整の種類" })
    .selectOption("round-10");
  await page.getByRole("button", { name: "自動調整を実行" }).click();
  await expect(page.locator(".adjustment-result")).toContainText(
    "設定した探索範囲では条件を満たす経路が見つかりませんでした",
  );
  await expect(page.getByTestId("current-hp")).toHaveText(before ?? "");
  await expect(
    page.getByRole("table", { name: "調整前後のステータスとスコア" }),
  ).toHaveCount(0);
});
