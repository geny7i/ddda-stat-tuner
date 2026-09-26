import { expect, test } from "vitest";
import { VOCATION_IDS, type CharacterInfo } from "../../domain";
import { buildShareUrl } from "./shareUrl";

test("現在の配置先を使って共有 URL を組み立てる", () => {
  const character: CharacterInfo = {
    characterType: "arisen",
    weightClass: "ll",
    vocationPath: {
      onlyLv1: [VOCATION_IDS.fighter],
      forLv10: Array(9).fill(VOCATION_IDS.mage),
      forLv100: [],
      forLv200: [],
    },
  };
  expect(buildShareUrl(character, "https://example.test/sub/app/#/chart")).toBe(
    "https://example.test/sub/app/#/restore?c=1-ll-z-x9--",
  );
});
