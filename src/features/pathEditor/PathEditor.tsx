import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
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
  countVocations,
  getLevelRangeById,
  isVocationAvailable,
  LEVEL_RANGES,
  type LevelRangeId,
  type VocationId,
  type VocationPath,
  type StatusGrowthWithScore,
} from "../../domain";
import { VocationComparison } from "./VocationComparison";
import { VocationIcon } from "./VocationIcon";
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
type EditorSelection =
  ({ kind: "add" } & Selection) | ({ kind: "replace" } & StackSelection) | null;

function useSelectionPressedRef(
  selected: boolean,
  attachDraggable: (element: Element | null) => void,
) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const attach = useCallback(
    (button: HTMLButtonElement | null) => {
      buttonRef.current = button;
      attachDraggable(button);
    },
    [attachDraggable],
  );

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    // dnd-kit also writes aria-pressed for drag state; selection owns this value.
    const sync = () => {
      const value = String(selected);
      if (button.getAttribute("aria-pressed") !== value)
        button.setAttribute("aria-pressed", value);
    };
    const observer = new MutationObserver(sync);
    observer.observe(button, {
      attributes: true,
      attributeFilter: ["aria-pressed"],
    });
    sync();
    return () => observer.disconnect();
  }, [selected]);

  return attach;
}

function sourceLabel(id: string | number): string {
  const source = parseSource(id);
  if (source?.kind === "selection")
    return `${source.vocationId} ${source.count}Lv`;
  if (source?.kind === "stack")
    return `${source.rangeId} の ${source.vocationId} 1Lv`;
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
  selected,
  onSelect,
}: Selection & {
  selected: boolean;
  onSelect: (selection: Selection) => void;
}) {
  const { ref } = useDraggable({
    id: selectionId(vocationId, count),
    type: "selection",
  });
  const pressedRef = useSelectionPressedRef(selected, ref);
  return (
    <button
      ref={pressedRef}
      type="button"
      className={`path-handle ${selected ? "path-selected-handle" : ""}`}
      aria-label={`${vocationId} ${count}Lvをドラッグまたは選択${selected ? "、選択中" : ""}`}
      aria-pressed={selected}
      onClick={() => onSelect({ vocationId, count })}
    >
      ×{count}
    </button>
  );
}

function PaletteCard({
  vocationId,
  onSelect,
  selectedAddition,
  selectedSource,
  draggedStack,
  onReplace,
}: {
  vocationId: VocationId;
  onSelect: (selection: Selection) => void;
  selectedAddition: Selection | null;
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
  const oneSelected =
    selectedAddition?.vocationId === vocationId && selectedAddition.count === 1;
  const pressedRef = useSelectionPressedRef(oneSelected, handleRef);
  return (
    <div
      ref={targetRef}
      className={`path-card ${isDropTarget ? (draggedStack && draggedStack.vocationId !== vocationId && isVocationAvailable(draggedStack.rangeId, vocationId) ? "path-target" : "path-rejected") : ""}`}
      data-testid={`palette-${vocationId}`}
    >
      <div ref={ref}>
        <strong className="vocation-row-name">
          <VocationIcon vocationId={vocationId} />
          {vocationId}
        </strong>
        <div className="path-actions">
          <button
            ref={pressedRef}
            type="button"
            className={`path-handle ${oneSelected ? "path-selected-handle" : ""}`}
            aria-label={`${vocationId} 1Lvをドラッグまたは選択${oneSelected ? "、選択中" : ""}`}
            aria-pressed={oneSelected}
            onClick={() => onSelect({ vocationId, count: 1 })}
          >
            ×1
          </button>
          <CountHandle
            vocationId={vocationId}
            count={10}
            selected={
              selectedAddition?.vocationId === vocationId &&
              selectedAddition.count === 10
            }
            onSelect={onSelect}
          />
          <CountHandle
            vocationId={vocationId}
            count={100}
            selected={
              selectedAddition?.vocationId === vocationId &&
              selectedAddition.count === 100
            }
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
            1Lv入替
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
  const isSelected =
    selectedSource?.rangeId === range && selectedSource.vocationId === vocation;
  const pressedRef = useSelectionPressedRef(isSelected, handleRef);

  return (
    <article
      ref={targetRef}
      className={`path-card path-stack ${isSelected ? "path-selected-stack" : ""} ${isDropTarget ? (draggedStack && draggedStack.rangeId === range && draggedStack.vocationId !== vocation ? "path-target" : "path-rejected") : ""}`}
      data-testid={`stack-${range}-${vocation}`}
    >
      <div ref={sourceRef}>
        <strong>{vocation}</strong>{" "}
        <span data-testid={`count-${range}-${vocation}`}>{count}Lv</span>
        <div className="path-actions">
          <button
            ref={pressedRef}
            type="button"
            className="path-handle"
            aria-label={`${range} の ${vocation} ${isSelected ? "選択中" : "入替対象に指定"}`}
            aria-pressed={isSelected}
            onClick={() =>
              onSelectSource({ rangeId: range, vocationId: vocation })
            }
          >
            {isSelected ? "選択中" : "入替対象に指定"}
          </button>
          <button type="button" onClick={() => onRemove(vocation)}>
            1Lv削除
          </button>
          <button
            type="button"
            disabled={!canReplace}
            onClick={() => onReplace(vocation)}
          >
            1Lv入替
          </button>
        </div>
      </div>
    </article>
  );
}

function RangeArea({
  range,
  path,
  selectedAddition,
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
  selectedAddition: Selection | null;
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
  const counts = countVocations(steps);
  const canAdd =
    !full &&
    selectedAddition !== null &&
    isVocationAvailable(range, selectedAddition.vocationId);

  return (
    <section
      ref={targetRef}
      className={`path-range ${isDropTarget ? (!full && draggedSelection && isVocationAvailable(range, draggedSelection.vocationId) ? "path-target" : "path-rejected") : ""} ${full ? "path-full" : ""}`}
      data-testid={`range-${range}`}
      aria-label={`レベル帯 ${range}`}
    >
      <div className="path-range-header">
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
      <div
        className="path-stacks"
        role="region"
        aria-label="配置済み職業の一覧"
        tabIndex={0}
      >
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
  comparisonRows: readonly StatusGrowthWithScore[];
  focusOptions: ReactNode;
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
  comparisonRows,
  focusOptions,
  onAdd,
  onReplace,
  onRemove,
}: PathEditorProps) {
  const [selection, setSelection] = useState<EditorSelection>(null);
  const [lastPath, setLastPath] = useState(path);
  const [draggedSelection, setDraggedSelection] = useState<Selection | null>(
    null,
  );
  const [draggedStack, setDraggedStack] = useState<StackSelection | null>(null);
  const selectedAddition = selection?.kind === "add" ? selection : null;
  const selectedSource =
    selection?.kind === "replace" &&
    path[selection.rangeId].includes(selection.vocationId)
      ? selection
      : null;

  if (path !== lastPath) {
    setLastPath(path);
    if (selection?.kind === "replace" && !selectedSource) setSelection(null);
  }

  function toggleAddition({ vocationId, count }: Selection) {
    setSelection((current) =>
      current?.kind === "add" &&
      current.vocationId === vocationId &&
      current.count === count
        ? null
        : { kind: "add", vocationId, count },
    );
  }

  function toggleReplacement({ rangeId, vocationId }: StackSelection) {
    setSelection((current) =>
      current?.kind === "replace" &&
      current.rangeId === rangeId &&
      current.vocationId === vocationId
        ? null
        : { kind: "replace", rangeId, vocationId },
    );
  }

  function replaceSelected(range: LevelRangeId, target: VocationId) {
    if (!selectedSource || selectedSource.rangeId !== range) return;
    if (selectedSource.vocationId === target) return;
    if (!isVocationAvailable(range, target)) return;
    onReplace(range, selectedSource.vocationId, target);
  }

  return (
    <div className="path-page">
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
            source.rangeId === target.rangeId &&
            source.vocationId !== target.vocationId
          ) {
            onReplace(source.rangeId, source.vocationId, target.vocationId);
            setSelection((current) =>
              current?.kind === "replace" ? null : current,
            );
          } else if (
            source?.kind === "stack" &&
            target?.kind === "vocation" &&
            source.vocationId !== target.vocationId &&
            isVocationAvailable(source.rangeId, target.vocationId)
          ) {
            onReplace(source.rangeId, source.vocationId, target.vocationId);
            setSelection((current) =>
              current?.kind === "replace" ? null : current,
            );
          }
        }}
      >
        <div className="path-layout">
          <div
            className="path-palette"
            role="region"
            aria-label="職業と成長値の一覧"
            tabIndex={0}
          >
            <VocationComparison
              rows={comparisonRows}
              focusOptions={focusOptions}
              renderVocation={(vocationId) => (
                <PaletteCard
                  vocationId={vocationId}
                  onSelect={toggleAddition}
                  selectedAddition={selectedAddition}
                  selectedSource={selectedSource}
                  draggedStack={draggedStack}
                  onReplace={() => {
                    if (selectedSource)
                      replaceSelected(selectedSource.rangeId, vocationId);
                  }}
                />
              )}
            />
          </div>
          <section aria-label="育成経路" className="path-board">
            <h2>育成経路</h2>
            {LEVEL_RANGES.filter(({ id }) => visibleRanges.includes(id)).map(
              ({ id }) => (
                <RangeArea
                  key={id}
                  range={id}
                  path={path}
                  selectedAddition={selectedAddition}
                  draggedSelection={draggedSelection}
                  draggedStack={draggedStack}
                  selectedSource={selectedSource}
                  onAdd={(range) => {
                    if (selectedAddition)
                      onAdd(
                        range,
                        selectedAddition.vocationId,
                        selectedAddition.count,
                      );
                  }}
                  onSelectSource={toggleReplacement}
                  onReplace={replaceSelected}
                  onRemove={(range, vocation) => {
                    if (
                      selectedSource?.rangeId === range &&
                      selectedSource.vocationId === vocation &&
                      countVocations(path[range]).get(vocation) === 1
                    )
                      setSelection(null);
                    onRemove(range, vocation);
                  }}
                />
              ),
            )}
          </section>
        </div>
        <DragOverlay dropAnimation={null}>
          {(source) => (
            <span className="path-overlay">{sourceLabel(source.id)}</span>
          )}
        </DragOverlay>
      </DragDropProvider>
    </div>
  );
}
