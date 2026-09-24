import { useEffect, useRef } from "react";
import {
  countVocations,
  LEVEL_RANGES,
  type LevelRangeId,
  type VocationPath,
} from "../../domain";
import { VocationIcon } from "./VocationIcon";

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
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const selected = list?.querySelector<HTMLButtonElement>(
      'button[aria-pressed="true"]',
    );
    if (!list || !selected) return;
    const left = selected.offsetLeft - list.offsetLeft;
    if (left < list.scrollLeft) list.scrollLeft = left;
    if (left + selected.offsetWidth > list.scrollLeft + list.clientWidth)
      list.scrollLeft = left + selected.offsetWidth - list.clientWidth;
  }, [activeRange]);

  return (
    <section className="editor-ranges" aria-labelledby="level-range-title">
      <h2 id="level-range-title">レベル帯</h2>
      <div className="editor-range-list" ref={listRef}>
        {LEVEL_RANGES.map(({ id, from, to }) => {
          const counts = countVocations(path[id]);
          const label = `Lv${from}～${to} (${path[id].length}/${to - from + 1})`;
          const descriptionId = `range-breakdown-${id}`;
          return (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-describedby={counts.size ? descriptionId : undefined}
              aria-pressed={activeRange === id}
              onClick={() => onSelect(id)}
            >
              <span className="editor-range-label">{label}</span>
              {counts.size > 0 && (
                <>
                  <span className="editor-range-breakdown" aria-hidden="true">
                    {[...counts].map(([vocationId, count]) => (
                      <span className="editor-range-count" key={vocationId}>
                        <VocationIcon vocationId={vocationId} />
                        <span>{count}</span>
                      </span>
                    ))}
                  </span>
                  <span id={descriptionId} className="visually-hidden">
                    {[...counts]
                      .map(([vocationId, count]) => `${vocationId} ${count}件`)
                      .join("、")}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
