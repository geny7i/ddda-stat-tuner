import type { BrowserContext, Locator, Page } from "@playwright/test";

export async function touchDrag(
  page: Page,
  context: BrowserContext,
  source: Locator,
  target: Locator,
) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox)
    throw new Error("タッチ操作の対象が表示されていません。");
  const from = {
    x: sourceBox.x + sourceBox.width / 2,
    y: sourceBox.y + sourceBox.height / 2,
  };
  const to = {
    x: targetBox.x + targetBox.width / 2,
    y: targetBox.y + targetBox.height / 2,
  };
  const session = await context.newCDPSession(page);
  try {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [from],
    });
    await page.waitForTimeout(300);
    for (let step = 1; step <= 12; step += 1) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: from.x + ((to.x - from.x) * step) / 12,
            y: from.y + ((to.y - from.y) * step) / 12,
          },
        ],
      });
    }
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await session.detach();
  }
}
