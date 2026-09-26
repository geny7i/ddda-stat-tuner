import type { ReactNode } from "react";
import {
  STAT_IDS,
  type StatusGrowthWithScore,
  type VocationId,
} from "../../domain";
import { STAT_LABELS } from "./statusLabels";

export function VocationComparison({
  rows,
  renderVocation,
  focusOptions,
}: {
  rows: readonly StatusGrowthWithScore[];
  renderVocation: (vocationId: VocationId) => ReactNode;
  focusOptions?: ReactNode;
}) {
  return (
    <section
      className="comparison-panel comparison-editable"
      aria-labelledby="vocation-comparison-title"
    >
      <h2 id="vocation-comparison-title">職業と成長値</h2>
      {focusOptions}
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
    </section>
  );
}
