import { expect, test } from "vitest";
import type { CharacterInfo, VocationPath } from "./character";
import { getAvailableVocations, LEVEL_RANGES } from "./levelRanges";
import { searchRoundingAdjustment } from "./roundingAdjustment";
import { type VocationId } from "./vocations";

function makePath(
  mode: "fighter" | "strider" | "mixed" | "attack",
): VocationPath {
  const path = {} as Record<keyof VocationPath, string[]>;
  for (const range of LEVEL_RANGES) {
    const length = range.to - range.from + 1;
    path[range.id] = Array.from({ length }, (_, index) => {
      if (mode === "fighter" || mode === "strider") return mode;
      if (mode === "attack") {
        return range.id === "forLv100" || range.id === "forLv200"
          ? "assassin"
          : "fighter";
      }
      return range.availableVocationIds[
        index % range.availableVocationIds.length
      ];
    });
  }
  return path as VocationPath;
}

test.runIf(process.env.ROUNDING_BENCH === "1")(
  "倍数調整の再現可能な探索計測",
  () => {
    const rows = [];
    for (const mode of ["fighter", "strider", "mixed", "attack"] as const) {
      const character: CharacterInfo = {
        characterType: "arisen",
        vocationPath: makePath(mode),
        weightClass: "m",
      };
      for (const multiple of [5, 10] as const) {
        const times: number[] = [];
        let result = searchRoundingAdjustment(character, multiple);
        for (let repeat = 0; repeat < 3; repeat++) {
          const start = performance.now();
          result = searchRoundingAdjustment(character, multiple);
          times.push(performance.now() - start);
        }
        times.sort((left, right) => left - right);
        rows.push({
          mode,
          multiple,
          result: result.kind,
          changed: result.kind === "found" ? result.changedCount : "-",
          expanded: result.kind === "found" ? result.expandedCount : 0,
          truncated: result.kind === "found" ? result.truncated : false,
          medianMilliseconds: Math.round(times[1]),
        });
      }
    }
    console.log(JSON.stringify(rows, null, 2));
  },
);

test.runIf(process.env.ROUNDING_BENCH === "1")(
  "ポーンの倍数探索の時間と調整品質を計測する",
  () => {
    const rows = [];
    for (const mode of [
      "fighter",
      "warrior",
      "sorcerer",
      "mixed",
      "impossible",
    ] as const) {
      const path: VocationPath = {
        onlyLv1: ["fighter"],
        forLv10:
          mode === "impossible"
            ? Array<VocationId>(9).fill("fighter")
            : ["mage", ...Array<VocationId>(8).fill("fighter")],
        forLv100: Array.from({ length: 90 }, (_, i) =>
          mode === "mixed"
            ? getAvailableVocations("forLv100", "pawn")[i % 6]
            : mode === "impossible"
              ? "fighter"
              : mode,
        ),
        forLv200: Array.from({ length: 100 }, (_, i) =>
          mode === "mixed"
            ? getAvailableVocations("forLv200", "pawn")[i % 6]
            : mode === "impossible"
              ? "fighter"
              : mode,
        ),
      };
      const character: CharacterInfo = {
        characterType: "pawn",
        weightClass: "m",
        vocationPath: path,
      };
      for (const multiple of [5, 10] as const) {
        let result = searchRoundingAdjustment(character, multiple);
        const times = [];
        for (let repeat = 0; repeat < 3; repeat++) {
          const start = performance.now();
          result = searchRoundingAdjustment(character, multiple);
          times.push(performance.now() - start);
        }
        expect(result.kind).toBe(
          mode === "impossible" && multiple === 10 ? "impossible" : "found",
        );
        times.sort((a, b) => a - b);
        rows.push({
          mode,
          multiple,
          result: result.kind,
          changed: result.kind === "found" ? result.changedCount : 0,
          expanded: result.kind === "found" ? result.expandedCount : 0,
          before: result.kind === "found" ? result.beforeStatus : null,
          after: result.kind === "found" ? result.afterStatus : null,
          scoreDelta:
            result.kind === "found"
              ? result.afterScore - result.beforeScore
              : 0,
          medianMilliseconds: Number(times[1].toFixed(2)),
        });
      }
    }
    console.log(JSON.stringify(rows, null, 2));
  },
);
