import { useEffect, useState } from "react";
import { getStoredTheme, setStoredTheme, applyTheme } from "../lib/theme";

const ORDER = ["system", "light", "dark"];
const ICON = { system: "🖥️", light: "☀️", dark: "🌙" };
const LABEL = { system: "Système", light: "Clair", dark: "Sombre" };

export default function ThemeToggle() {
  const [mode, setMode] = useState(getStoredTheme);

  useEffect(() => {
    applyTheme(mode);
    setStoredTheme(mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  function cycle() {
    setMode((m) => ORDER[(ORDER.indexOf(m) + 1) % ORDER.length]);
  }

  return (
    <button
      type="button"
      className="theme-toggle-row"
      onClick={cycle}
      title={`Thème : ${LABEL[mode]} (cliquer pour changer)`}
      aria-label={`Changer de thème — actuellement ${LABEL[mode]}`}
    >
      {ICON[mode]} Thème : {LABEL[mode]}
    </button>
  );
}
