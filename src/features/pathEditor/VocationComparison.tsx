import type { ReactNode } from "react";
import {
  STAT_IDS,
  type StatusGrowthWithScore,
  type VocationId,
} from "../../domain";
import { STAT_LABELS } from "./statusLabels";

export function VocationComparison({
  rows,
  showChart = false,
  renderVocation,
  focusOptions,
}: {
  rows: readonly StatusGrowthWithScore[];
  showChart?: boolean;
  renderVocation?: (vocationId: VocationId) => ReactNode;
  focusOptions?: ReactNode;
}) {
  const maxScore = Math.max(1, ...rows.map(({ score }) => score));

  return (
    <section
      className={`comparison-panel ${renderVocation ? "comparison-editable" : ""}`}
      aria-labelledby="vocation-comparison-title"
    >
      <h2 id="vocation-comparison-title">
        {renderVocation ? "職業と成長値" : "職業ごとの成長値"}
      </h2>
      {renderVocation && focusOptions}
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
      {renderVocation ? (
        <ol className="comparison-cards" aria-label="職業と成長値の一覧">
          {rows.map(({ vocationId, status, score }) => (
            <li
              className="comparison-card"
              key={vocationId}
              data-testid={`comparison-${vocationId}`}
            >
              <div className="comparison-card-header">
                {renderVocation(vocationId)}
                <div className="comparison-card-score">
                  <span>score</span>
                  <output data-testid={`score-${vocationId}`}>{score}</output>
                </div>
              </div>
              <dl className="comparison-card-stats">
                {STAT_IDS.map((statId) => (
                  <div key={statId}>
                    <dt title={STAT_LABELS[statId]}>{statId}</dt>
                    <dd>{status[statId]}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>
      ) : (
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
      )}
    </section>
  );
}
