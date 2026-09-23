import { useEffect, useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { parseCharacterCode, type CharacterInfo } from "../../domain";
import { useAppDispatch } from "../../app/hooks";
import { restoreCharacter } from "../pathEditor/editorSlice";

type RestoreResult =
  { ok: true; character: CharacterInfo } | { ok: false; message: string };

function restoreResult(code: string | null): RestoreResult {
  if (!code) return { ok: false, message: "復元コードが指定されていません。" };
  try {
    return { ok: true, character: parseCharacterCode(code) };
  } catch (error) {
    return {
      ok: false,
      message: `復元コードを読み込めません: ${error instanceof Error ? error.message : "不明なエラー"}`,
    };
  }
}

export function RestorePage() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const code = new URLSearchParams(search).get("c");
  const result = useMemo(() => restoreResult(code), [code]);

  useEffect(() => {
    if (!result.ok) return;
    dispatch(restoreCharacter(result.character));
    navigate("/", { replace: true });
  }, [dispatch, navigate, result]);

  if (result.ok) return <p role="status">育成経路を復元しています。</p>;
  return (
    <section aria-labelledby="restore-error-title">
      <h1 id="restore-error-title">復元できませんでした</h1>
      <p role="alert">{result.message}</p>
      <Link to="/">育成計画へ戻る</Link>
    </section>
  );
}
