import { LEVEL_RANGES } from "../domain";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  selectCharacterInfo,
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
import { ShareButton } from "../features/sharing/ShareButton";
import "../features/pathEditor/editor.css";

export function ChartPage() {
  const dispatch = useAppDispatch();
  const { path, activeRange, focusedStats } = useAppSelector(selectEditorState);
  const character = useAppSelector(selectCharacterInfo);
  const status = useAppSelector(selectCurrentStatus);
  const level = useAppSelector(selectCurrentLevel);
  const range = LEVEL_RANGES.find(({ id }) => id === activeRange);
  if (!range) throw new Error(`不明なレベル帯: ${activeRange}`);

  return (
    <div className="chart-page">
      <h1>職業比較チャート</h1>
      <p>
        現在の育成結果と、選択したレベル帯での職業ごとの成長値を比較します。
      </p>
      <StatusSummary status={status} level={level} />
      <ShareButton character={character} />
      <LevelRangeSelector
        activeRange={activeRange}
        path={path}
        onSelect={(id) => dispatch(setActiveRange(id))}
      />
      <VocationComparison
        range={range}
        focusedStats={focusedStats}
        onToggleFocus={(statId) => dispatch(toggleFocusedStat(statId))}
        showChart
      />
    </div>
  );
}
