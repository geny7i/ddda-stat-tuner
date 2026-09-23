import {
  LEVEL_RANGES,
  WEIGHT_CLASSES,
  type LevelRangeId,
  type WeightClass,
} from "../../domain";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  addSteps,
  removeStep,
  replaceStep,
  setActiveRange,
  setWeightClass,
} from "./editorSlice";
import { PathEditor } from "./PathEditor";

function rangeLabel(id: LevelRangeId): string {
  const range = LEVEL_RANGES.find((candidate) => candidate.id === id);
  if (!range) throw new Error(`不明なレベル帯: ${id}`);
  return `Lv${range.from}～${range.to}`;
}

export function EditorPage() {
  const dispatch = useAppDispatch();
  const { path, activeRange, weightClass } = useAppSelector(
    (state) => state.editor,
  );
  const selectedRange = LEVEL_RANGES.find(({ id }) => id === activeRange);
  if (!selectedRange) throw new Error(`不明なレベル帯: ${activeRange}`);

  return (
    <div className="editor-page">
      <h1>育成計画</h1>
      <p>レベル帯を選び、職業を追加・変更・削除して育成経路を組み立てます。</p>

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

        <section aria-label="レベル帯の選択">
          <h2>レベル帯</h2>
          <div className="editor-range-list">
            {LEVEL_RANGES.map(({ id, from, to }) => (
              <button
                key={id}
                type="button"
                aria-pressed={activeRange === id}
                onClick={() => dispatch(setActiveRange(id))}
              >
                Lv{from}～{to} ({path[id].length}/{to - from + 1})
              </button>
            ))}
          </div>
        </section>
      </div>

      <h2 className="editor-current-range">
        編集中: {rangeLabel(activeRange)}
      </h2>
      <PathEditor
        key={activeRange}
        path={path}
        visibleRanges={[activeRange]}
        vocations={selectedRange.availableVocationIds}
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
