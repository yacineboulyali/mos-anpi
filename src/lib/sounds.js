// Sound effects are optional: drop matching files in src/assets/sounds/
// (see the README there). Missing files are silently ignored.
const files = import.meta.glob("../assets/sounds/*.{mp3,wav,ogg}", {
  eager: true,
  query: "?url",
  import: "default",
});

function urlFor(name) {
  const match = Object.keys(files).find((path) => {
    const base = path.slice(path.lastIndexOf("/") + 1);
    return base.startsWith(`${name}.`);
  });
  return match ? files[match] : null;
}

const cache = {};
const STORAGE_KEY = "mos_sound_enabled";

export function isSoundEnabled() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore (private browsing, storage disabled, etc.)
  }
}

export function playSound(name) {
  if (!isSoundEnabled()) return;
  const url = urlFor(name);
  if (!url) return;
  try {
    const audio = cache[name] ?? (cache[name] = new Audio(url));
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // ignore playback errors (autoplay restrictions, unsupported format, etc.)
  }
}
