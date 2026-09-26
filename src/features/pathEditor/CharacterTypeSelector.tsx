import { useRef, useState } from "react";
import { CHARACTER_TYPES, type CharacterType } from "../../domain";

export const CHARACTER_TYPE_LABELS = {
  arisen: "覚者",
  pawn: "ポーン",
} as const;

export function CharacterTypeSelector({
  value,
  hasInput,
  onSwitch,
}: {
  value: CharacterType;
  hasInput: boolean;
  onSwitch: (value: CharacterType) => void;
}) {
  const [pending, setPending] = useState<CharacterType | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <fieldset className="editor-weight">
        <legend>キャラクター</legend>
        {CHARACTER_TYPES.map((type) => (
          <label key={type}>
            <input
              type="radio"
              name="character-type"
              value={type}
              checked={value === type}
              onChange={(event) => {
                if (type === value) return;
                if (!hasInput) {
                  onSwitch(type);
                  return;
                }
                triggerRef.current = event.currentTarget;
                setPending(type);
                dialogRef.current?.showModal();
                cancelRef.current?.focus();
              }}
            />
            {CHARACTER_TYPE_LABELS[type]}
          </label>
        ))}
      </fieldset>
      <dialog
        ref={dialogRef}
        className="editor-help-dialog"
        aria-labelledby="character-switch-title"
        aria-describedby="character-switch-description"
        onClose={() => {
          setPending(null);
          triggerRef.current?.focus();
        }}
      >
        <div className="editor-help-content">
          <h2 id="character-switch-title">職業入力をリセットしますか？</h2>
          <p id="character-switch-description">
            {pending && CHARACTER_TYPE_LABELS[pending]}
            に切り替えると、すべてのレベル帯の職業入力がリセットされます。体格は維持されます。
          </p>
          <div className="path-actions">
            <button
              ref={cancelRef}
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => {
                if (pending) onSwitch(pending);
                dialogRef.current?.close();
              }}
            >
              リセットして切り替える
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
