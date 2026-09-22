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
  VOCATION_IDS,
} from "../../domain";
import {
  addSelection,
  applyDrop,
  initialTrialState,
  parseSource,
  parseTarget,
  rangeId,
  removeOne,
  replaceOne,
  selectionId,
  stackId,
  type TrialState,
} from "./model";
import "./trial.css";

type Selection = { vocationId: VocationId; count: number };
type StackSelection = { rangeId: LevelRangeId; vocationId: VocationId };

const trialVocations: readonly VocationId[] = [
  VOCATION_IDS.fighter,
  VOCATION_IDS.mage,
  VOCATION_IDS.assassin,
];

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
}: {
  vocationId: VocationId;
  onSelect: (selection: Selection) => void;
}) {
  const { ref, handleRef } = useDraggable({
    id: selectionId(vocationId, 1),
    type: "selection",
  });
  return (
    <div ref={ref} className="trial-card" data-testid={`palette-${vocationId}`}>
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
        <CountHandle vocationId={vocationId} count={100} onSelect={onSelect} />
      </div>
    </div>
  );
}

function StackCard({
  range,
  vocation,
  count,
  selectedSource,
  onSelectSource,
  onReplace,
  onRemove,
}: {
  range: LevelRangeId;
  vocation: VocationId;
  count: number;
  selectedSource: StackSelection | null;
  onSelectSource: (source: StackSelection) => void;
  onReplace: (target: VocationId) => void;
  onRemove: (vocation: VocationId) => void;
}) {
  const { ref: targetRef, isDropTarget } = useDroppable({
    id: stackId(range, vocation),
    accept: (source) => {
      const parsed = parseSource(source.id);
      return (
        parsed?.kind === "stack" &&
        parsed.rangeId === range &&
        parsed.vocationId !== vocation
      );
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
      className={`trial-card trial-stack ${isDropTarget ? "trial-target" : ""}`}
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
  state,
  selected,
  selectedSource,
  onAdd,
  onSelectSource,
  onReplace,
  onRemove,
}: {
  range: LevelRangeId;
  state: TrialState;
  selected: Selection | null;
  selectedSource: StackSelection | null;
  onAdd: (range: LevelRangeId) => void;
  onSelectSource: (source: StackSelection) => void;
  onReplace: (range: LevelRangeId, target: VocationId) => void;
  onRemove: (range: LevelRangeId, vocation: VocationId) => void;
}) {
  const definition = getLevelRangeById(range);
  const steps = state.path[range];
  const limit = definition.to - definition.from + 1;
  const full = steps.length >= limit;
  const { ref: targetRef, isDropTarget } = useDroppable({
    id: rangeId(range),
    disabled: full,
    accept: (source) => {
      const parsed = parseSource(source.id);
      return (
        parsed?.kind === "selection" &&
        isVocationAvailable(range, parsed.vocationId)
      );
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
      className={`trial-range ${isDropTarget ? "trial-target" : ""} ${full ? "trial-full" : ""}`}
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

export function DndTrial() {
  const [state, setState] = useState(initialTrialState);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [selectedSource, setSelectedSource] = useState<StackSelection | null>(
    null,
  );

  return (
    <div className="trial-page">
      <h1>ドラッグ操作の試運転</h1>
      <p id="trial-instructions">
        各 ×
        ボタンをドラッグし、右側のレベル帯にドロップします。配置済みの職業は別の職業へドラッグして変更します。キーボードでは
        Space で持ち上げ、矢印キーで移動し、Space で確定、Escape
        で中止します。ボタンをクリックして選び、追加・変更することもできます。
      </p>
      <DragDropProvider
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
          const sourceId = operation.source?.id;
          if (canceled || sourceId === undefined) return;
          setState((current) =>
            applyDrop(current, sourceId, operation.target?.id ?? null),
          );
        }}
      >
        <div className="trial-layout">
          <section aria-label="職業の選択肢" className="trial-palette">
            <h2>職業の選択肢</h2>
            {trialVocations.map((vocationId) => (
              <PaletteCard
                key={vocationId}
                vocationId={vocationId}
                onSelect={setSelected}
              />
            ))}
            <p>
              選択中:{" "}
              {selected ? `${selected.vocationId} ×${selected.count}` : "なし"}
            </p>
          </section>
          <section aria-label="育成経路" className="trial-board">
            <h2>育成経路</h2>
            {LEVEL_RANGES.map(({ id }) => (
              <RangeArea
                key={id}
                range={id}
                state={state}
                selected={selected}
                selectedSource={selectedSource}
                onAdd={(range) => {
                  if (selected)
                    setState((current) =>
                      addSelection(
                        current,
                        range,
                        selected.vocationId,
                        selected.count,
                      ),
                    );
                }}
                onSelectSource={setSelectedSource}
                onReplace={(range, target) => {
                  if (selectedSource) {
                    setState((current) =>
                      replaceOne(
                        current,
                        range,
                        selectedSource.vocationId,
                        target,
                      ),
                    );
                  }
                }}
                onRemove={(range, vocation) =>
                  setState((current) => removeOne(current, range, vocation))
                }
              />
            ))}
          </section>
        </div>
        <DragOverlay dropAnimation={null} className="trial-overlay">
          {(source) => <span>{sourceLabel(source.id)}</span>}
        </DragOverlay>
      </DragDropProvider>
      <p role="status">{state.message}</p>
      <output data-testid="update-count">更新回数: {state.updates}</output>
    </div>
  );
}
