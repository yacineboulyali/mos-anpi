import { useState } from "react";
import { isSoundEnabled, setSoundEnabled } from "../lib/sounds";

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(isSoundEnabled);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
  }

  return (
    <button
      type="button"
      className="sound-toggle-trigger"
      onClick={toggle}
      title={enabled ? "Désactiver les effets sonores" : "Activer les effets sonores"}
      aria-label={enabled ? "Désactiver les effets sonores" : "Activer les effets sonores"}
      aria-pressed={enabled}
    >
      {enabled ? "🔊" : "🔇"}
    </button>
  );
}
