import { useEffect, useRef } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import helpMarkdown from "../content/help.md?raw";
import { HelpMarkdown } from "../features/help/HelpMarkdown";
import "../features/help/help.css";

export function HelpPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const section = searchParams.get("section");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const heading = section ? document.getElementById(section) : null;
      if (
        heading &&
        pageRef.current?.contains(heading) &&
        heading.matches(".help-body :is(h1, h2, h3, h4, h5, h6)")
      ) {
        heading.scrollIntoView({ block: "start" });
        heading.focus({ preventScroll: true });
      } else {
        window.scrollTo(0, 0);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [location.key, section]);

  return (
    <div ref={pageRef} className="help-page">
      <h1>使い方</h1>
      <p>
        <Link to="/">育成計画へ戻る</Link>
      </p>
      <HelpMarkdown source={helpMarkdown} />
    </div>
  );
}
