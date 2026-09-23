import { useState } from "react";
import { serializeCharacter, type CharacterInfo } from "../../domain";
import { buildShareUrl } from "./shareUrl";

export function ShareButton({ character }: { character: CharacterInfo }) {
  const code = serializeCharacter(character);
  const [result, setResult] = useState<{
    code: string;
    status: "copied" | "error";
  } | null>(null);

  async function copyUrl() {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard API is unavailable");
      await navigator.clipboard.writeText(
        buildShareUrl(character, window.location.href),
      );
      setResult({ code, status: "copied" });
    } catch {
      setResult({ code, status: "error" });
    }
  }

  return (
    <div className="share-control">
      <button type="button" onClick={copyUrl}>
        共有 URL をコピー
      </button>
      {result?.code === code && result.status === "copied" && (
        <span role="status">コピーしました。</span>
      )}
      {result?.code === code && result.status === "error" && (
        <span role="alert">
          コピーできませんでした。ブラウザーの権限を確認してください。
        </span>
      )}
    </div>
  );
}
