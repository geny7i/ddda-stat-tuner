import { useEffect, useRef } from "react";
import {
  countUnfilledLevels,
  LEVEL_RANGES,
  WEIGHT_CLASSES,
  type CharacterInfo,
  type RoundingMultiple,
  type RoundingSearchResult,
  type StatId,
  type WeightClass,
} from "../../domain";
import { useAppDispatch, useAppSelector, useAppStore } from "../../app/hooks";
import {
  addSteps,
  applyAdjustment,
  applyRoundingAdjustment,
  removeAllSteps,
  removeStep,
  replaceStep,
  setActiveRange,
  setWeightClass,
  toggleFocusedStat,
} from "./editorSlice";
import { PathEditor } from "./PathEditor";
import { AdjustmentControls } from "./AdjustmentControls";
import { runRoundingSearch } from "./runRoundingSearch";
import { FocusOptions } from "./FocusOptions";
import { StatusSummary } from "./StatusSummary";
import { EditorHelp } from "./EditorHelp";
import { ShareButton } from "../sharing/ShareButton";
import { LevelRangeSelector, rangeLabel } from "./LevelRangeSelector";
import {
  selectCharacterInfo,
  selectComparisonRows,
  selectCurrentLevel,
  selectCurrentStatus,
  selectUnfilledCount,
} from "./selectors";

function sameCharacter(left: CharacterInfo, right: CharacterInfo): boolean {
  return (
    left.characterType === right.characterType &&
    left.weightClass === right.weightClass &&
    LEVEL_RANGES.every(
      ({ id }) =>
        left.vocationPath[id].every(
          (vocation, index) => vocation === right.vocationPath[id][index],
        ) && left.vocationPath[id].length === right.vocationPath[id].length,
    )
  );
}

export function EditorPage() {
  const dispatch = useAppDispatch();
  const appStore = useAppStore();
  const activeSearch = useRef<AbortController | null>(null);
  useEffect(() => () => activeSearch.current?.abort(), []);
  const { path, activeRange, weightClass, focusedStats, characterType } =
    useAppSelector((state) => state.editor);
  const currentStatus = useAppSelector(selectCurrentStatus);
  const currentLevel = useAppSelector(selectCurrentLevel);
  const character = useAppSelector(selectCharacterInfo);
  const comparisonRows = useAppSelector(selectComparisonRows);
  const unfilledCount = useAppSelector(selectUnfilledCount);

  function applySelectedAdjustment(statId: StatId): number {
    const before = countUnfilledLevels(appStore.getState().editor.path);
    dispatch(
      applyAdjustment({
        strategy: { kind: "maximize-stat", statId },
        scope: { kind: "unfilled" },
      }),
    );
    return before - countUnfilledLevels(appStore.getState().editor.path);
  }

  async function applyRounding(
    multiple: RoundingMultiple,
  ): Promise<RoundingSearchResult | { kind: "stale" }> {
    const editor = appStore.getState().editor;
    const expected: CharacterInfo = {
      characterType: editor.characterType,
      vocationPath: editor.path,
      weightClass: editor.weightClass,
    };
    const controller = new AbortController();
    activeSearch.current?.abort();
    activeSearch.current = controller;
    try {
      const result = await runRoundingSearch(
        expected,
        multiple,
        controller.signal,
      );
      const current = appStore.getState().editor;
      if (
        !sameCharacter(expected, {
          characterType: current.characterType,
          vocationPath: current.path,
          weightClass: current.weightClass,
        })
      ) {
        return { kind: "stale" };
      }
      if (result.kind === "found" && result.changedCount > 0) {
        dispatch(applyRoundingAdjustment({ expected, path: result.path }));
      }
      return result;
    } finally {
      if (activeSearch.current === controller) activeSearch.current = null;
    }
  }

  return (
    <div className="editor-page">
      <div className="editor-title-row">
        <h1>育成計画</h1>
        <EditorHelp />
      </div>

      <div className="editor-sticky-bar">
        <StatusSummary status={currentStatus} level={currentLevel} />
        <LevelRangeSelector
          activeRange={activeRange}
          path={path}
          onSelect={(id) => dispatch(setActiveRange(id))}
        />
      </div>
      <ShareButton character={character} />

      <div className="editor-controls">
        <AdjustmentControls
          unfilledCount={unfilledCount}
          onApply={applySelectedAdjustment}
          onRound={applyRounding}
        />
        <fieldset className="editor-weight">
          <legend>体格</legend>
          {WEIGHT_CLASSES.map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="weight-class"
                value={value}
                checked={weightClass === value}
                onChange={() => dispatch(setWeightClass(value as WeightClass))}
              />
              {value.toUpperCase()}
            </label>
          ))}
        </fieldset>
      </div>

      <h2 className="editor-current-range">
        編集中: {rangeLabel(activeRange)}
      </h2>
      <PathEditor
        key={activeRange}
        characterType={characterType}
        path={path}
        visibleRanges={[activeRange]}
        comparisonRows={comparisonRows}
        focusOptions={
          <FocusOptions
            focusedStats={focusedStats}
            onToggleFocus={(statId) => dispatch(toggleFocusedStat(statId))}
          />
        }
        onAdd={(range, vocation, count) =>
          dispatch(addSteps({ range, vocation, count }))
        }
        onReplace={(range, source, target) =>
          dispatch(replaceStep({ range, source, target }))
        }
        onRemove={(range, vocation) =>
          dispatch(removeStep({ range, vocation }))
        }
        onRemoveAll={(range, vocation) =>
          dispatch(removeAllSteps({ range, vocation }))
        }
      />
    </div>
  );
}
