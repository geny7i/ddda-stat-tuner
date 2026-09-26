import { test } from "vitest";
import type { CharacterInfo, VocationPath } from "./character";
import { LEVEL_RANGES } from "./levelRanges";
import { searchRoundingAdjustment } from "./roundingAdjustment";

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
          expanded: result.kind === "incomplete" ? 0 : result.expandedCount,
          truncated: result.kind === "incomplete" ? false : result.truncated,
          medianMilliseconds: Math.round(times[1]),
        });
      }
    }
    console.log(JSON.stringify(rows, null, 2));
  },
);
