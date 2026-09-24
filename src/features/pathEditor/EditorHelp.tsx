import { useRef } from "react";

const HELP_TEXT =
  "レベル帯を選び、職業の ×1・×10・×100 を育成経路へドラッグして追加します。ボタンを選んで「選択を追加」でも追加できます。配置済み職業を別の職業へドラッグすると、1Lv 分を入れ替えます。「入替対象に指定」を選んで「1Lv入替」でも操作できます。配置済み職業は「1Lv削除」で減らせます。職業カード右上の × ですべてのLvを削除できます。";

export function EditorHelp() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  function open() {
    dialogRef.current?.showModal();
    headingRef.current?.focus();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="editor-help-button"
        aria-label="育成計画の使い方"
        onClick={open}
      >
        使い方
      </button>
      <dialog
        ref={dialogRef}
        className="editor-help-dialog"
        aria-labelledby="editor-help-title"
        onClose={() => buttonRef.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="editor-help-content">
          <h2 id="editor-help-title" ref={headingRef} tabIndex={-1}>
            育成計画の使い方
          </h2>
          <p>{HELP_TEXT}</p>
          <button type="button" onClick={close}>
            閉じる
          </button>
        </div>
      </dialog>
    </>
  );
}
