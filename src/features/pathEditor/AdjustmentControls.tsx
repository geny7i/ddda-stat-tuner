import { useState } from "react";
import {
  STAT_IDS,
  type RoundingMultiple,
  type RoundingSearchResult,
  type StatId,
} from "../../domain";
import { STAT_LABELS } from "./statusLabels";

type AdjustmentKind = StatId | "round-5" | "round-10";
type RoundingOutcome = RoundingSearchResult | { kind: "stale" };
type FoundResult = Extract<RoundingSearchResult, { kind: "found" }>;

function adjustmentName(kind: AdjustmentKind): string {
  if (kind === "round-5") return "全ステータスを5の倍数に調整";
  if (kind === "round-10") return "全ステータスを10の倍数に調整";
  return `${STAT_LABELS[kind]} 特化で未選択レベルを埋める`;
}

function isRoundingKind(kind: AdjustmentKind): kind is "round-5" | "round-10" {
  return kind === "round-5" || kind === "round-10";
}

function ResultComparison({ result }: { result: FoundResult }) {
  return (
    <table className="adjustment-comparison">
      <caption>調整前後のステータスとスコア</caption>
      <thead>
        <tr>
          <th scope="col">項目</th>
          <th scope="col">調整前</th>
          <th scope="col">調整後</th>
        </tr>
      </thead>
      <tbody>
        {STAT_IDS.map((id) => (
          <tr key={id}>
            <th scope="row">{STAT_LABELS[id]}</th>
            <td>{result.beforeStatus[id]}</td>
            <td>{result.afterStatus[id]}</td>
          </tr>
        ))}
        <tr>
          <th scope="row">スコア</th>
          <td>{result.beforeScore}</td>
          <td>{result.afterScore}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function AdjustmentControls({
  unfilledCount,
  onApply,
  onRound,
}: {
  unfilledCount: number;
  onApply: (statId: StatId) => number;
  onRound: (multiple: RoundingMultiple) => Promise<RoundingOutcome>;
}) {
  const [kind, setKind] = useState<AdjustmentKind>("hp");
  const [resultMessage, setResultMessage] = useState("");
  const [roundingResult, setRoundingResult] = useState<FoundResult | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const rounding = isRoundingKind(kind);

  async function execute() {
    setResultMessage("");
    setRoundingResult(null);
    if (!isRoundingKind(kind)) {
      const changedCount = onApply(kind);
      setResultMessage(
        `「${adjustmentName(kind)}」を実行し、${changedCount} レベルを追加しました。`,
      );
      return;
    }

    const multiple: RoundingMultiple = kind === "round-5" ? 5 : 10;
    setBusy(true);
    setResultMessage(`${multiple}の倍数への調整を探索中です。`);
    try {
      const result = await onRound(multiple);
      if (result.kind === "stale") {
        setResultMessage(
          "探索中に育成経路または体格が変わったため、結果を適用しませんでした。",
        );
      } else if (result.kind === "incomplete") {
        setResultMessage(
          `実行には残り${result.unfilledCount}Lvの選択が必要です。`,
        );
      } else {
        setRoundingResult(result);
        setResultMessage(
          result.changedCount === 0
            ? `全ステータスはすでに${multiple}の倍数です。変更はありません。`
            : `全ステータスを${multiple}の倍数に調整し、${result.changedCount}Lvを変更しました。強みとスコアの低下を抑えるように調整しました。`,
        );
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setResultMessage("探索を実行できませんでした。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="adjustment-panel" aria-labelledby="adjustment-title">
      <h2 id="adjustment-title">自動調整</h2>
      <label htmlFor="adjustment-kind">調整の種類</label>
      <select
        id="adjustment-kind"
        value={kind}
        disabled={busy}
        aria-describedby="adjustment-description"
        onChange={(event) => {
          setKind(event.target.value as AdjustmentKind);
          setResultMessage("");
          setRoundingResult(null);
        }}
      >
        {STAT_IDS.map((id) => (
          <option key={id} value={id}>
            {adjustmentName(id)}
          </option>
        ))}
        <option value="round-5">{adjustmentName("round-5")}</option>
        <option value="round-10">{adjustmentName("round-10")}</option>
      </select>
      <p id="adjustment-description">
        {rounding ? (
          <>
            全200Lvの選択後に実行できます。最大26Lvの職業を入れ替え、6ステータスすべてを
            {kind === "round-5" ? 5 : 10}
            の倍数にします。相対的に高い能力とスコアの低下を抑えるように調整します。
          </>
        ) : (
          <>
            未選択のレベルだけを対象に、{STAT_LABELS[kind]}
            の成長値が最大の職業で埋めます。すでに選んだ職業は変更しません。
          </>
        )}
      </p>
      <div className="adjustment-action">
        <span>
          {rounding
            ? unfilledCount > 0
              ? `実行には残り${unfilledCount}Lvの選択が必要です。`
              : "変更対象: 最大26Lv"
            : `変更対象: ${unfilledCount} レベル`}
        </span>
        <button
          type="button"
          disabled={
            busy || (rounding ? unfilledCount > 0 : unfilledCount === 0)
          }
          onClick={() => void execute()}
        >
          自動調整を実行
        </button>
      </div>
      <p className="adjustment-result" role="status">
        {resultMessage}
      </p>
      {roundingResult && <ResultComparison result={roundingResult} />}
    </section>
  );
}
