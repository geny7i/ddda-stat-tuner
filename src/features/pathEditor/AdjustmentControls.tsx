import { useState } from "react";
import { STAT_IDS, type StatId } from "../../domain";
import { STAT_LABELS } from "./statusLabels";

function adjustmentName(statId: StatId): string {
  return `${STAT_LABELS[statId]} 特化で未選択レベルを埋める`;
}

export function AdjustmentControls({
  unfilledCount,
  onApply,
}: {
  unfilledCount: number;
  onApply: (statId: StatId) => number;
}) {
  const [statId, setStatId] = useState<StatId>("hp");
  const [resultMessage, setResultMessage] = useState("");

  return (
    <section className="adjustment-panel" aria-labelledby="adjustment-title">
      <h2 id="adjustment-title">自動調整</h2>
      <label htmlFor="adjustment-kind">調整の種類</label>
      <select
        id="adjustment-kind"
        value={statId}
        aria-describedby="adjustment-description"
        onChange={(event) => {
          setStatId(event.target.value as StatId);
          setResultMessage("");
        }}
      >
        {STAT_IDS.map((id) => (
          <option key={id} value={id}>
            {adjustmentName(id)}
          </option>
        ))}
      </select>
      <p id="adjustment-description">
        未選択のレベルだけを対象に、{STAT_LABELS[statId]}
        の成長値が最大の職業で埋めます。すでに選んだ職業は変更しません。
      </p>
      <div className="adjustment-action">
        <span>変更対象: {unfilledCount} レベル</span>
        <button
          type="button"
          disabled={unfilledCount === 0}
          onClick={() => {
            const changedCount = onApply(statId);
            setResultMessage(
              `「${adjustmentName(statId)}」を実行し、${changedCount} レベルを追加しました。`,
            );
          }}
        >
          自動調整を実行
        </button>
      </div>
      <p className="adjustment-result" role="status">
        {resultMessage}
      </p>
    </section>
  );
}
