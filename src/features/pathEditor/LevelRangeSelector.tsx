import {
  LEVEL_RANGES,
  type LevelRangeId,
  type VocationPath,
} from "../../domain";

export function rangeLabel(id: LevelRangeId): string {
  const range = LEVEL_RANGES.find((candidate) => candidate.id === id);
  if (!range) throw new Error(`不明なレベル帯: ${id}`);
  return `Lv${range.from}～${range.to}`;
}

export function LevelRangeSelector({
  activeRange,
  path,
  onSelect,
}: {
  activeRange: LevelRangeId;
  path: VocationPath;
  onSelect: (id: LevelRangeId) => void;
}) {
  return (
    <section aria-labelledby="level-range-title">
      <h2 id="level-range-title">レベル帯</h2>
      <div className="editor-range-list">
        {LEVEL_RANGES.map(({ id, from, to }) => (
          <button
            key={id}
            type="button"
            aria-pressed={activeRange === id}
            onClick={() => onSelect(id)}
          >
            Lv{from}～{to} ({path[id].length}/{to - from + 1})
          </button>
        ))}
      </div>
    </section>
  );
}
