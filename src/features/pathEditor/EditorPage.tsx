import {
  countUnfilledLevels,
  WEIGHT_CLASSES,
  type StatId,
  type WeightClass,
} from "../../domain";
import { useAppDispatch, useAppSelector, useAppStore } from "../../app/hooks";
import {
  addSteps,
  applyAdjustment,
  removeStep,
  replaceStep,
  setActiveRange,
  setWeightClass,
  toggleFocusedStat,
} from "./editorSlice";
import { PathEditor } from "./PathEditor";
import { AdjustmentControls } from "./AdjustmentControls";
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

export function EditorPage() {
  const dispatch = useAppDispatch();
  const appStore = useAppStore();
  const { path, activeRange, weightClass, focusedStats } = useAppSelector(
    (state) => state.editor,
  );
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
      />
    </div>
  );
}
