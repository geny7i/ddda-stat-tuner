import { STAT_IDS, type Status } from "../../domain";
import { STAT_LABELS } from "./statusLabels";

export function StatusSummary({
  status,
  level,
}: {
  status: Status;
  level: number;
}) {
  return (
    <section className="status-panel" aria-labelledby="current-status-title">
      <div className="status-heading">
        <h2 id="current-status-title">現在のステータス</h2>
        <span>Lv {level}</span>
      </div>
      <dl className="status-values">
        {STAT_IDS.map((statId) => (
          <div key={statId}>
            <dt>{STAT_LABELS[statId]}</dt>
            <dd data-testid={`current-${statId}`}>{status[statId]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
