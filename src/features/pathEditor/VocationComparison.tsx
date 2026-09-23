import {
  getStatusGrowth,
  sortByFocusedStatIds,
  STAT_IDS,
  type LevelRange,
  type StatId,
} from "../../domain";
import { STAT_LABELS } from "./statusLabels";

export function VocationComparison({
  range,
  focusedStats,
  onToggleFocus,
  showChart = false,
}: {
  range: LevelRange;
  focusedStats: readonly StatId[];
  onToggleFocus: (statId: StatId) => void;
  showChart?: boolean;
}) {
  const rows = sortByFocusedStatIds(
    range.availableVocationIds.map((vocationId) =>
      getStatusGrowth(vocationId, range.id),
    ),
    focusedStats,
  );
  const maxScore = Math.max(1, ...rows.map(({ score }) => score));

  return (
    <section
      className="comparison-panel"
      aria-labelledby="vocation-comparison-title"
    >
      <h2 id="vocation-comparison-title">職業ごとの成長値</h2>
      <fieldset className="focus-options">
        <legend>注目するステータス</legend>
        {STAT_IDS.map((statId) => (
          <label key={statId}>
            <input
              type="checkbox"
              checked={focusedStats.includes(statId)}
              onChange={() => onToggleFocus(statId)}
            />
            {STAT_LABELS[statId]}
          </label>
        ))}
      </fieldset>
      {showChart && (
        <ul className="score-chart" aria-label="職業スコアの比較">
          {rows.map(({ vocationId, score }) => (
            <li key={vocationId}>
              <span>{vocationId}</span>
              <meter min="0" max={maxScore} value={score}>
                {score}
              </meter>
              <output>{score}</output>
            </li>
          ))}
        </ul>
      )}
      <div className="comparison-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">職業</th>
              <th scope="col">スコア</th>
              {STAT_IDS.map((statId) => (
                <th scope="col" key={statId}>
                  {STAT_LABELS[statId]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ vocationId, status, score }) => (
              <tr key={vocationId} data-testid={`comparison-${vocationId}`}>
                <th scope="row">{vocationId}</th>
                <td data-testid={`score-${vocationId}`}>{score}</td>
                {STAT_IDS.map((statId) => (
                  <td key={statId}>{status[statId]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
