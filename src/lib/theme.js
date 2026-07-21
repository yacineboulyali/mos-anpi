const KEY = "mos_theme"; // "system" | "light" | "dark"

export function getStoredTheme() {
  try {
    return localStorage.getItem(KEY) || "system";
  } catch {
    return "system";
  }
}

export function setStoredTheme(mode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // ignore
  }
}

export function resolveTheme(mode) {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

export function applyTheme(mode) {
  document.documentElement.setAttribute("data-theme", resolveTheme(mode));
}
