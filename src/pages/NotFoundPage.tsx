import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-title">
      <h1 id="not-found-title">ページが見つかりません</h1>
      <p>URL を確認するか、育成計画へ戻ってください。</p>
      <Link to="/">育成計画へ戻る</Link>
    </section>
  );
}
