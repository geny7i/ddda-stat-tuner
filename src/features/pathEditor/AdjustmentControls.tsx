import { useRef, useState } from "react";
import {
  STAT_IDS,
  getRoundingEligibility,
  getRoundingChangeLimits,
  type CharacterInfo,
  type RoundingMultiple,
  type RoundingSearchResult,
  type StatId,
} from "../../domain";
import { STAT_LABELS } from "./statusLabels";

type AdjustmentKind = StatId | "round-5" | "round-10";
export type RoundingOutcome = RoundingSearchResult | { kind: "stale" };
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

function impossibleMessage(mageCount: number) {
  return `ポーンの10の倍数調整には、Lv2〜10でメイジとして成長した回数が奇数である必要があります。現在は${mageCount}回のため実行できません。5の倍数への調整は利用できます。`;
}

export function AdjustmentControls({
  character,
  revision,
  unfilledCount,
  onApply,
  onRound,
}: {
  character: CharacterInfo;
  revision: number;
  unfilledCount: number;
  onApply: (statId: StatId) => { changedCount: number; revision: number };
  onRound: (
    multiple: RoundingMultiple,
  ) => Promise<{ result: RoundingOutcome; revision: number }>;
}) {
  const [kind, setKind] = useState<AdjustmentKind>("hp");
  const [feedback, setFeedback] = useState<{
    revision: number;
    message: string;
    result?: FoundResult;
  } | null>(null);
  const [runningRevision, setRunningRevision] = useState<number | null>(null);
  const requestId = useRef(0);
  const busy = runningRevision === revision;
  const currentFeedback = feedback?.revision === revision ? feedback : null;
  const rounding = isRoundingKind(kind);
  const multiple = kind === "round-5" ? 5 : 10;
  const eligibility = rounding
    ? getRoundingEligibility(character, multiple)
    : null;
  const limits = getRoundingChangeLimits(character.characterType, multiple);
  const maxChanges = limits.forLv100 + limits.forLv200;
  const blockedMessage =
    eligibility?.kind === "impossible"
      ? impossibleMessage(eligibility.mageCount)
      : null;

  async function execute() {
    if (busy || (rounding && eligibility?.kind !== "ready")) return;
    const id = ++requestId.current;
    setFeedback(null);
    if (!isRoundingKind(kind)) {
      const applied = onApply(kind);
      setFeedback({
        revision: applied.revision,
        message: `「${adjustmentName(kind)}」を実行し、${applied.changedCount} レベルを追加しました。`,
      });
      return;
    }

    setRunningRevision(revision);
    setFeedback({
      revision,
      message: `${multiple}の倍数への調整を探索中です。`,
    });
    try {
      const response = await onRound(multiple);
      if (requestId.current !== id) return;
      const result = response.result;
      let message: string;
      if (result.kind === "stale") {
        message = "探索中に育成計画が変わったため、結果を適用しませんでした。";
      } else if (result.kind === "incomplete") {
        message = `実行には残り${result.unfilledCount}Lvの選択が必要です。`;
      } else if (result.kind === "impossible") {
        message = impossibleMessage(result.mageCount);
      } else {
        message =
          result.changedCount === 0
            ? `全ステータスはすでに${multiple}の倍数です。変更はありません。`
            : `全ステータスを${multiple}の倍数に調整し、${result.changedCount}Lvを変更しました。強みとスコアの低下を抑えるように調整しました。`;
      }
      setFeedback({
        revision: response.revision,
        message,
        result: result.kind === "found" ? result : undefined,
      });
    } catch (error) {
      if (requestId.current !== id) return;
      if (error instanceof DOMException && error.name === "AbortError") {
        setFeedback(null);
        return;
      }
      setFeedback({
        revision,
        message: "探索を実行できませんでした。もう一度お試しください。",
      });
    } finally {
      if (requestId.current === id) setRunningRevision(null);
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
        aria-describedby={
          blockedMessage
            ? "adjustment-description adjustment-blocked"
            : "adjustment-description"
        }
        onChange={(event) => {
          setKind(event.target.value as AdjustmentKind);
          requestId.current++;
          setFeedback(null);
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
            全200Lvの選択後に実行できます。Lv1〜10を維持し、最大{maxChanges}
            Lvの職業を入れ替え、6ステータスすべてを
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
      {blockedMessage && (
        <p id="adjustment-blocked" role="status">
          {blockedMessage}
        </p>
      )}
      <div className="adjustment-action">
        <span>
          {rounding
            ? unfilledCount > 0
              ? `実行には残り${unfilledCount}Lvの選択が必要です。`
              : `変更対象: 最大${maxChanges}Lv`
            : `変更対象: ${unfilledCount} レベル`}
        </span>
        <button
          type="button"
          disabled={
            busy ||
            (rounding ? eligibility?.kind !== "ready" : unfilledCount === 0)
          }
          aria-describedby={blockedMessage ? "adjustment-blocked" : undefined}
          onClick={() => void execute()}
        >
          自動調整を実行
        </button>
      </div>
      <p className="adjustment-result" role="status">
        {currentFeedback?.message}
      </p>
      {currentFeedback?.result && (
        <ResultComparison result={currentFeedback.result} />
      )}
    </section>
  );
}
