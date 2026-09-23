import { expect, test } from "vitest";
import { getComparisonRows, LEVEL_RANGES } from "./index";

test("注目項目のスコア順に並べ、同点では職業の定義順を保つ", () => {
  const range = LEVEL_RANGES.find(({ id }) => id === "forLv100");
  if (!range) throw new Error("レベル帯がありません");

  const attackRows = getComparisonRows(range, ["atk"]);
  expect(attackRows[0]).toMatchObject({ vocationId: "assassin", score: 6 });
  expect(attackRows[1]).toMatchObject({ vocationId: "warrior", score: 5 });
  expect(attackRows.map(({ vocationId }) => vocationId)).toEqual([
    "assassin",
    "warrior",
    "fighter",
    "ranger",
    "strider",
    "mage",
    "sorcerer",
    "magick_archer",
    "mystic_knight",
  ]);
  expect(attackRows[0].status.atk).toBe(6);
  expect(range.availableVocationIds[0]).toBe("fighter");
});
