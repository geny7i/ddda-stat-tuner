import { lazy, Suspense } from "react";
import { HashRouter, NavLink, Route, Routes } from "react-router";
import { EditorPage } from "./features/pathEditor/EditorPage";

const TrialPage = import.meta.env.DEV
  ? lazy(() =>
      import("./trial/dnd/DndTrial").then(({ DndTrial }) => ({
        default: DndTrial,
      })),
    )
  : null;

const pages = [
  { to: "/", label: "育成計画" },
  { to: "/chart", label: "チャート" },
  { to: "/disclaimer", label: "免責事項" },
] as const;

function Page({ title }: { title: string }) {
  return (
    <section aria-labelledby="page-title">
      <h1 id="page-title">{title}</h1>
      <p>この画面の機能は、今後の PR で追加します。</p>
    </section>
  );
}

export function App() {
  return (
    <HashRouter>
      <header>
        <div className="layout">
          <p className="site-title">DDDA Stat Tuner</p>
          <nav aria-label="メインメニュー">
            {pages.map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === "/"}>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="layout">
        <Routes>
          <Route path="/" element={<EditorPage />} />
          <Route path="/chart" element={<Page title="チャート" />} />
          <Route path="/disclaimer" element={<Page title="免責事項" />} />
          {TrialPage && (
            <Route
              path="/dnd-trial"
              element={
                <Suspense fallback={<p>試運転画面を読み込み中です。</p>}>
                  <TrialPage />
                </Suspense>
              }
            />
          )}
          <Route path="*" element={<Page title="ページが見つかりません" />} />
        </Routes>
      </main>
    </HashRouter>
  );
}
