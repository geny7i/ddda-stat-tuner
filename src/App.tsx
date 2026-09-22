import { HashRouter, NavLink, Route, Routes } from "react-router";

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
          <Route path="/" element={<Page title="育成計画" />} />
          <Route path="/chart" element={<Page title="チャート" />} />
          <Route path="/disclaimer" element={<Page title="免責事項" />} />
          <Route path="*" element={<Page title="ページが見つかりません" />} />
        </Routes>
      </main>
    </HashRouter>
  );
}
