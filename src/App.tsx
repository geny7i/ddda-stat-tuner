import { HashRouter, Link, NavLink, Route, Routes } from "react-router";
import { EditorPage } from "./features/pathEditor/EditorPage";
import { RestorePage } from "./features/sharing/RestorePage";
import { ChartPage } from "./pages/ChartPage";
import { DisclaimerPage } from "./pages/DisclaimerPage";
import { NotFoundPage } from "./pages/NotFoundPage";

const pages = [
  { to: "/", label: "育成計画" },
  { to: "/chart", label: "チャート" },
  { to: "/disclaimer", label: "免責事項" },
] as const;

export function App() {
  const focusMainContent = () => {
    document.getElementById("main-content")?.focus();
  };

  return (
    <HashRouter>
      <button className="skip-link" type="button" onClick={focusMainContent}>
        本文へ移動
      </button>
      <header>
        <div className="layout header-layout">
          <Link className="site-title" to="/">
            DDDA Stat Tuner
          </Link>
          <nav aria-label="メインメニュー">
            {pages.map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === "/"}>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main id="main-content" className="layout" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<EditorPage />} />
          <Route path="/chart" element={<ChartPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="/restore" element={<RestorePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </HashRouter>
  );
}
