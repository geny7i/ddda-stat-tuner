import { useEffect, useRef } from "react";
import { Link } from "react-router";
import {
  countUnfilledLevels,
  getRoundingEligibility,
  LEVEL_RANGES,
  WEIGHT_CLASSES,
  type CharacterInfo,
  type RoundingMultiple,
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
  switchCharacterType,
} from "./editorSlice";
import { PathEditor } from "./PathEditor";
import { AdjustmentControls, type RoundingOutcome } from "./AdjustmentControls";
import { CharacterTypeSelector } from "./CharacterTypeSelector";
import { runRoundingSearch } from "./runRoundingSearch";
import { FocusOptions } from "./FocusOptions";
import { StatusSummary } from "./StatusSummary";
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
  useEffect(() => {
    let revision = appStore.getState().editor.revision;
    const unsubscribe = appStore.subscribe(() => {
      const current = appStore.getState().editor.revision;
      if (current !== revision) {
        activeSearch.current?.abort();
        activeSearch.current = null;
        revision = current;
      }
    });
    return () => {
      unsubscribe();
      activeSearch.current?.abort();
    };
  }, [appStore]);
  const {
    path,
    activeRange,
    weightClass,
    focusedStats,
    characterType,
    revision,
    resetId,
  } = useAppSelector((state) => state.editor);
  const currentStatus = useAppSelector(selectCurrentStatus);
  const currentLevel = useAppSelector(selectCurrentLevel);
  const character = useAppSelector(selectCharacterInfo);
  const comparisonRows = useAppSelector(selectComparisonRows);
  const unfilledCount = useAppSelector(selectUnfilledCount);

  function applySelectedAdjustment(statId: StatId) {
    const before = countUnfilledLevels(appStore.getState().editor.path);
    dispatch(
      applyAdjustment({
        strategy: { kind: "maximize-stat", statId },
        scope: { kind: "unfilled" },
      }),
    );
    const current = appStore.getState().editor;
    return {
      changedCount: before - countUnfilledLevels(current.path),
      revision: current.revision,
    };
  }

  async function applyRounding(
    multiple: RoundingMultiple,
  ): Promise<{ result: RoundingOutcome; revision: number }> {
    const editor = appStore.getState().editor;
    const expected: CharacterInfo = {
      characterType: editor.characterType,
      vocationPath: editor.path,
      weightClass: editor.weightClass,
    };
    const expectedRevision = editor.revision;
    const eligibility = getRoundingEligibility(expected, multiple);
    if (eligibility.kind !== "ready")
      return { result: eligibility, revision: expectedRevision };
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
        controller.signal.aborted ||
        activeSearch.current !== controller ||
        current.revision !== expectedRevision ||
        !sameCharacter(expected, {
          characterType: current.characterType,
          vocationPath: current.path,
          weightClass: current.weightClass,
        })
      ) {
        return { result: { kind: "stale" }, revision: expectedRevision };
      }
      // Applying our own result changes revision; do not abort this completed search.
      activeSearch.current = null;
      if (result.kind === "found" && result.changedCount > 0) {
        dispatch(
          applyRoundingAdjustment({
            expected,
            expectedRevision,
            path: result.path,
          }),
        );
      }
      return { result, revision: appStore.getState().editor.revision };
    } finally {
      if (activeSearch.current === controller) activeSearch.current = null;
    }
  }

  return (
    <div className="editor-page">
      <div className="editor-title-row">
        <h1>育成計画</h1>
        <Link className="editor-help-link" to="/help">
          使い方
        </Link>
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
          key={resetId}
          character={character}
          revision={revision}
          unfilledCount={unfilledCount}
          onApply={applySelectedAdjustment}
          onRound={applyRounding}
        />
        <CharacterTypeSelector
          value={characterType}
          hasInput={currentLevel > 0}
          onSwitch={(value) => dispatch(switchCharacterType(value))}
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
        key={`${resetId}:${activeRange}`}
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
