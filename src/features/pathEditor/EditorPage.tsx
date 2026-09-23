import { WEIGHT_CLASSES, type WeightClass } from "../../domain";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  addSteps,
  removeStep,
  replaceStep,
  setActiveRange,
  setWeightClass,
  toggleFocusedStat,
} from "./editorSlice";
import { PathEditor } from "./PathEditor";
import { FocusOptions } from "./FocusOptions";
import { StatusSummary } from "./StatusSummary";
import { ShareButton } from "../sharing/ShareButton";
import { LevelRangeSelector, rangeLabel } from "./LevelRangeSelector";
import {
  selectCharacterInfo,
  selectComparisonRows,
  selectCurrentLevel,
  selectCurrentStatus,
} from "./selectors";

export function EditorPage() {
  const dispatch = useAppDispatch();
  const { path, activeRange, weightClass, focusedStats } = useAppSelector(
    (state) => state.editor,
  );
  const currentStatus = useAppSelector(selectCurrentStatus);
  const currentLevel = useAppSelector(selectCurrentLevel);
  const character = useAppSelector(selectCharacterInfo);
  const comparisonRows = useAppSelector(selectComparisonRows);

  return (
    <div className="editor-page">
      <h1>育成計画</h1>
      <p>レベル帯を選び、職業を追加・変更・削除して育成経路を組み立てます。</p>

      <StatusSummary status={currentStatus} level={currentLevel} />
      <ShareButton character={character} />

      <div className="editor-controls">
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

        <LevelRangeSelector
          activeRange={activeRange}
          path={path}
          onSelect={(id) => dispatch(setActiveRange(id))}
        />
      </div>

      <h2 className="editor-current-range">
        編集中: {rangeLabel(activeRange)}
      </h2>
      <FocusOptions
        focusedStats={focusedStats}
        onToggleFocus={(statId) => dispatch(toggleFocusedStat(statId))}
      />
      <PathEditor
        key={activeRange}
        path={path}
        visibleRanges={[activeRange]}
        comparisonRows={comparisonRows}
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
