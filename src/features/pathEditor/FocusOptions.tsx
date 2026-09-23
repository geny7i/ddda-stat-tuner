import { STAT_IDS, type StatId } from "../../domain";
import { STAT_LABELS } from "./statusLabels";

export function FocusOptions({
  focusedStats,
  onToggleFocus,
}: {
  focusedStats: readonly StatId[];
  onToggleFocus: (statId: StatId) => void;
}) {
  return (
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
  );
}
