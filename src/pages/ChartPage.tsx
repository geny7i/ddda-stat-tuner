import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  selectCharacterInfo,
  selectComparisonRows,
  selectCurrentLevel,
  selectCurrentStatus,
  selectEditorState,
} from "../features/pathEditor/selectors";
import {
  setActiveRange,
  toggleFocusedStat,
} from "../features/pathEditor/editorSlice";
import { LevelRangeSelector } from "../features/pathEditor/LevelRangeSelector";
import { StatusSummary } from "../features/pathEditor/StatusSummary";
import { VocationComparison } from "../features/pathEditor/VocationComparison";
import { FocusOptions } from "../features/pathEditor/FocusOptions";
import { ShareButton } from "../features/sharing/ShareButton";
import { CHARACTER_TYPE_LABELS } from "../features/pathEditor/CharacterTypeSelector";
import "../features/pathEditor/editor.css";

export function ChartPage() {
  const dispatch = useAppDispatch();
  const { path, activeRange, focusedStats } = useAppSelector(selectEditorState);
  const character = useAppSelector(selectCharacterInfo);
  const status = useAppSelector(selectCurrentStatus);
  const level = useAppSelector(selectCurrentLevel);
  const comparisonRows = useAppSelector(selectComparisonRows);

  return (
    <div className="chart-page">
      <h1>職業比較チャート</h1>
      <p>
        現在の育成結果と、選択したレベル帯での職業ごとの成長値を比較します。
      </p>
      <p>
        キャラクター: {CHARACTER_TYPE_LABELS[character.characterType]}
        （切り替えは育成計画画面）
      </p>
      <StatusSummary status={status} level={level} />
      <ShareButton character={character} />
      <LevelRangeSelector
        activeRange={activeRange}
        path={path}
        onSelect={(id) => dispatch(setActiveRange(id))}
      />
      <FocusOptions
        focusedStats={focusedStats}
        onToggleFocus={(statId) => dispatch(toggleFocusedStat(statId))}
      />
      <VocationComparison rows={comparisonRows} showChart />
    </div>
  );
}
