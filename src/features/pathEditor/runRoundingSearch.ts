import type {
  CharacterInfo,
  RoundingMultiple,
  RoundingSearchResult,
} from "../../domain";

export function runRoundingSearch(
  character: CharacterInfo,
  multiple: RoundingMultiple,
  signal: AbortSignal,
): Promise<RoundingSearchResult> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Search aborted", "AbortError"));
      return;
    }
    const worker = new Worker(new URL("./roundingWorker.ts", import.meta.url), {
      type: "module",
    });
    const finish = () => {
      signal.removeEventListener("abort", abort);
      worker.terminate();
    };
    const abort = () => {
      finish();
      reject(new DOMException("Search aborted", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event: MessageEvent<RoundingSearchResult>) => {
      finish();
      resolve(event.data);
    };
    worker.onerror = () => {
      finish();
      reject(new Error("探索処理を実行できませんでした。"));
    };
    worker.postMessage({ character, multiple });
  });
}
