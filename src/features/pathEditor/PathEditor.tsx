import { useState } from "react";
import {
  DragDropProvider,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/react";
import {
  Accessibility,
  KeyboardSensor,
  PointerActivationConstraints,
  PointerSensor,
} from "@dnd-kit/dom";
import {
  getLevelRangeById,
  isVocationAvailable,
  LEVEL_RANGES,
  type LevelRangeId,
  type VocationId,
  type VocationPath,
} from "../../domain";
import {
  parseSource,
  parseTarget,
  rangeId,
  selectionId,
  stackId,
  vocationTargetId,
} from "./dragIds";
import "./editor.css";

type Selection = { vocationId: VocationId; count: number };
type StackSelection = { rangeId: LevelRangeId; vocationId: VocationId };

function sourceLabel(id: string | number): string {
  const source = parseSource(id);
  if (source?.kind === "selection")
    return `${source.vocationId} ${source.count} 件`;
  if (source?.kind === "stack")
    return `${source.rangeId} の ${source.vocationId} 1 件`;
  return String(id);
}

function targetLabel(id: string | number): string {
  const target = parseTarget(id);
  if (target?.kind === "range") return target.rangeId;
  if (target?.kind === "stack")
    return `${target.rangeId} の ${target.vocationId}`;
  if (target?.kind === "vocation") return target.vocationId;
  return String(id);
}

function CountHandle({
  vocationId,
  count,
  onSelect,
}: Selection & { onSelect: (selection: Selection) => void }) {
  const { ref } = useDraggable({
    id: selectionId(vocationId, count),
    type: "selection",
  });
  return (
    <button
      ref={ref}
      type="button"
      className="trial-handle"
      aria-label={`${vocationId} ${count} 件をドラッグまたは選択`}
      onClick={() => onSelect({ vocationId, count })}
    >
      ×{count}
    </button>
  );
}

function PaletteCard({
  vocationId,
  onSelect,
  selectedSource,
  draggedStack,
  onReplace,
}: {
  vocationId: VocationId;
  onSelect: (selection: Selection) => void;
  selectedSource: StackSelection | null;
  draggedStack: StackSelection | null;
  onReplace: () => void;
}) {
  const { ref: targetRef, isDropTarget } = useDroppable({
    id: vocationTargetId(vocationId),
    accept: (source) => {
      const parsed = parseSource(source.id);
      return parsed?.kind === "stack";
    },
  });
  const { ref, handleRef } = useDraggable({
    id: selectionId(vocationId, 1),
    type: "selection",
  });
  return (
    <div
      ref={targetRef}
      className={`trial-card ${isDropTarget ? (draggedStack && draggedStack.vocationId !== vocationId && isVocationAvailable(draggedStack.rangeId, vocationId) ? "trial-target" : "trial-rejected") : ""}`}
      data-testid={`palette-${vocationId}`}
    >
      <div ref={ref}>
        <strong>{vocationId}</strong>
        <div className="trial-actions">
          <button
            ref={handleRef}
            type="button"
            className="trial-handle"
            aria-label={`${vocationId} 1 件をドラッグまたは選択`}
            onClick={() => onSelect({ vocationId, count: 1 })}
          >
            ×1
          </button>
          <CountHandle vocationId={vocationId} count={10} onSelect={onSelect} />
          <CountHandle
            vocationId={vocationId}
            count={100}
            onSelect={onSelect}
          />
        </div>
        {selectedSource && (
          <button
            type="button"
            disabled={
              selectedSource.vocationId === vocationId ||
              !isVocationAvailable(selectedSource.rangeId, vocationId)
            }
            onClick={onReplace}
          >
            この職業へ変更
          </button>
        )}
      </div>
    </div>
  );
}

function StackCard({
  range,
  vocation,
  count,
  selectedSource,
  draggedStack,
  onSelectSource,
  onReplace,
  onRemove,
}: {
  range: LevelRangeId;
  vocation: VocationId;
  count: number;
  selectedSource: StackSelection | null;
  draggedStack: StackSelection | null;
  onSelectSource: (source: StackSelection) => void;
  onReplace: (target: VocationId) => void;
  onRemove: (vocation: VocationId) => void;
}) {
  const { ref: targetRef, isDropTarget } = useDroppable({
    id: stackId(range, vocation),
    accept: (source) => {
      const parsed = parseSource(source.id);
      return parsed?.kind === "stack";
    },
    collisionPriority: 1,
  });
  const { ref: sourceRef, handleRef } = useDraggable({
    id: stackId(range, vocation),
    type: "stack",
  });
  const canReplace =
    selectedSource?.rangeId === range && selectedSource.vocationId !== vocation;

  return (
    <article
      ref={targetRef}
      className={`trial-card trial-stack ${isDropTarget ? (draggedStack && draggedStack.rangeId === range && draggedStack.vocationId !== vocation ? "trial-target" : "trial-rejected") : ""}`}
      data-testid={`stack-${range}-${vocation}`}
    >
      <div ref={sourceRef}>
        <strong>{vocation}</strong>{" "}
        <span data-testid={`count-${range}-${vocation}`}>{count} 件</span>
        <div className="trial-actions">
          <button
            ref={handleRef}
            type="button"
            className="trial-handle"
            aria-label={`${range} の ${vocation} 1 件をドラッグまたは選択`}
            onClick={() =>
              onSelectSource({ rangeId: range, vocationId: vocation })
            }
          >
            1 件を選択
          </button>
          <button type="button" onClick={() => onRemove(vocation)}>
            1 件削除
          </button>
          <button
            type="button"
            disabled={!canReplace}
            onClick={() => onReplace(vocation)}
          >
            ここへ変更
          </button>
        </div>
      </div>
    </article>
  );
}

function RangeArea({
  range,
  path,
  selected,
  draggedSelection,
  draggedStack,
  selectedSource,
  onAdd,
  onSelectSource,
  onReplace,
  onRemove,
}: {
  range: LevelRangeId;
  path: VocationPath;
  selected: Selection | null;
  draggedSelection: Selection | null;
  draggedStack: StackSelection | null;
  selectedSource: StackSelection | null;
  onAdd: (range: LevelRangeId) => void;
  onSelectSource: (source: StackSelection) => void;
  onReplace: (range: LevelRangeId, target: VocationId) => void;
  onRemove: (range: LevelRangeId, vocation: VocationId) => void;
}) {
  const definition = getLevelRangeById(range);
  const steps = path[range];
  const limit = definition.to - definition.from + 1;
  const full = steps.length >= limit;
  const { ref: targetRef, isDropTarget } = useDroppable({
    id: rangeId(range),
    accept: (source) => {
      const parsed = parseSource(source.id);
      return parsed?.kind === "selection";
    },
  });
  const counts = new Map<VocationId, number>();
  for (const vocation of steps)
    counts.set(vocation, (counts.get(vocation) ?? 0) + 1);
  const canAdd =
    !full &&
    selected !== null &&
    isVocationAvailable(range, selected.vocationId);

  return (
    <section
      ref={targetRef}
      className={`trial-range ${isDropTarget ? (!full && draggedSelection && isVocationAvailable(range, draggedSelection.vocationId) ? "trial-target" : "trial-rejected") : ""} ${full ? "trial-full" : ""}`}
      data-testid={`range-${range}`}
      aria-label={`レベル帯 ${range}`}
    >
      <div className="trial-range-header">
        <h3>
          Lv{definition.from}～{definition.to}
        </h3>
        <span data-testid={`capacity-${range}`}>
          {steps.length}/{limit}
        </span>
        <button type="button" disabled={!canAdd} onClick={() => onAdd(range)}>
          選択を追加
        </button>
      </div>
      <div className="trial-stacks">
        {[...counts].map(([vocation, count]) => (
          <StackCard
            key={vocation}
            range={range}
            vocation={vocation}
            count={count}
            selectedSource={selectedSource}
            draggedStack={draggedStack}
            onSelectSource={onSelectSource}
            onReplace={(target) => onReplace(range, target)}
            onRemove={(target) => onRemove(range, target)}
          />
        ))}
        {counts.size === 0 && <p>ここへ職業をドロップできます。</p>}
      </div>
    </section>
  );
}

type PathEditorProps = {
  path: VocationPath;
  visibleRanges: readonly LevelRangeId[];
  vocations: readonly VocationId[];
  onAdd: (range: LevelRangeId, vocation: VocationId, count: number) => void;
  onReplace: (
    range: LevelRangeId,
    source: VocationId,
    target: VocationId,
  ) => void;
  onRemove: (range: LevelRangeId, vocation: VocationId) => void;
};

export function PathEditor({
  path,
  visibleRanges,
  vocations,
  onAdd,
  onReplace,
  onRemove,
}: PathEditorProps) {
  const [selected, setSelected] = useState<Selection | null>(null);
  const [draggedSelection, setDraggedSelection] = useState<Selection | null>(
    null,
  );
  const [draggedStack, setDraggedStack] = useState<StackSelection | null>(null);
  const [selectedSource, setSelectedSource] = useState<StackSelection | null>(
    null,
  );

  return (
    <div className="trial-page">
      <p id="trial-instructions">
        各 ×
        ボタンをドラッグし、右側のレベル帯にドロップします。配置済みの職業は別の職業へドラッグして変更します。キーボードでは
        Space で持ち上げ、矢印キーで移動し、Space で確定、Escape
        で中止します。ボタンをクリックして選び、追加・変更することもできます。
      </p>
      <DragDropProvider
        onDragStart={({ operation }) => {
          const parsed = operation.source && parseSource(operation.source.id);
          setDraggedSelection(parsed?.kind === "selection" ? parsed : null);
          setDraggedStack(parsed?.kind === "stack" ? parsed : null);
        }}
        sensors={(defaults) => [
          ...defaults.filter(
            (sensor) => sensor !== PointerSensor && sensor !== KeyboardSensor,
          ),
          PointerSensor.configure({
            activationConstraints: (event) =>
              event.pointerType === "touch"
                ? [
                    new PointerActivationConstraints.Delay({
                      value: 250,
                      tolerance: 5,
                    }),
                  ]
                : [new PointerActivationConstraints.Distance({ value: 5 })],
          }),
          KeyboardSensor.configure({ offset: 20 }),
        ]}
        plugins={(defaults) => [
          ...defaults,
          Accessibility.configure({
            screenReaderInstructions: {
              draggable:
                "Space で持ち上げ、矢印キーで移動します。Space で確定、Escape で中止します。",
            },
            announcements: {
              dragstart: ({ operation }: DragStartEvent) =>
                operation.source
                  ? `${sourceLabel(operation.source.id)} を持ち上げました。`
                  : undefined,
              dragover: ({ operation }: DragOverEvent) =>
                operation.target
                  ? `${targetLabel(operation.target.id)} の上に移動しました。`
                  : undefined,
              dragend: ({ operation, canceled }: DragEndEvent) =>
                canceled
                  ? "ドラッグを中止しました。"
                  : operation.target
                    ? `${targetLabel(operation.target.id)} にドロップしました。`
                    : "ドロップ先はありません。",
            },
          }),
        ]}
        onDragEnd={({ canceled, operation }) => {
          setDraggedSelection(null);
          setDraggedStack(null);
          const sourceId = operation.source?.id;
          if (canceled || sourceId === undefined) return;
          const source = parseSource(sourceId);
          const targetId = operation.target?.id;
          const target = targetId === undefined ? null : parseTarget(targetId);
          if (source?.kind === "selection" && target?.kind === "range") {
            onAdd(target.rangeId, source.vocationId, source.count);
          } else if (
            source?.kind === "stack" &&
            target?.kind === "stack" &&
            source.rangeId === target.rangeId
          ) {
            onReplace(source.rangeId, source.vocationId, target.vocationId);
          } else if (source?.kind === "stack" && target?.kind === "vocation") {
            onReplace(source.rangeId, source.vocationId, target.vocationId);
          }
        }}
      >
        <div className="trial-layout">
          <section aria-label="職業の選択肢" className="trial-palette">
            <h2>職業の選択肢</h2>
            {vocations.map((vocationId) => (
              <PaletteCard
                key={vocationId}
                vocationId={vocationId}
                onSelect={setSelected}
                selectedSource={selectedSource}
                draggedStack={draggedStack}
                onReplace={() => {
                  if (selectedSource)
                    onReplace(
                      selectedSource.rangeId,
                      selectedSource.vocationId,
                      vocationId,
                    );
                }}
              />
            ))}
            <p>
              選択中:{" "}
              {selected ? `${selected.vocationId} ×${selected.count}` : "なし"}
            </p>
          </section>
          <section aria-label="育成経路" className="trial-board">
            <h2>育成経路</h2>
            {LEVEL_RANGES.filter(({ id }) => visibleRanges.includes(id)).map(
              ({ id }) => (
                <RangeArea
                  key={id}
                  range={id}
                  path={path}
                  selected={selected}
                  draggedSelection={draggedSelection}
                  draggedStack={draggedStack}
                  selectedSource={selectedSource}
                  onAdd={(range) => {
                    if (selected)
                      onAdd(range, selected.vocationId, selected.count);
                  }}
                  onSelectSource={setSelectedSource}
                  onReplace={(range, target) => {
                    if (selectedSource)
                      onReplace(range, selectedSource.vocationId, target);
                  }}
                  onRemove={onRemove}
                />
              ),
            )}
          </section>
        </div>
        <DragOverlay dropAnimation={null} className="trial-overlay">
          {(source) => <span>{sourceLabel(source.id)}</span>}
        </DragOverlay>
      </DragDropProvider>
    </div>
  );
}
