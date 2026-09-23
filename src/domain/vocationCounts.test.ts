import { expect, test } from "vitest";
import { countVocations, VOCATIONS } from "./index";

test("同じ職業を合算し、最初に現れた順序を保つ", () => {
  const steps = ["mage", "fighter", "mage", "strider", "fighter"] as const;
  expect([...countVocations(steps)]).toEqual([
    ["mage", 2],
    ["fighter", 2],
    ["strider", 1],
  ]);
  expect(steps).toEqual(["mage", "fighter", "mage", "strider", "fighter"]);
  expect([...countVocations([])]).toEqual([]);
  expect(countVocations(VOCATIONS).size).toBe(9);
});
