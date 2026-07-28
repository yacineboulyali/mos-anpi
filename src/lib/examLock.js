// Verrou anti-triche : tant qu'un examen officiel est en cours, on empêche
// l'ouverture des autres pages du site sur le même appareil (autre onglet ou
// même onglet naviguant ailleurs). Utilise localStorage (partagé entre tous
// les onglets d'un même navigateur), contrairement à sessionStorage qui est
// isolé par onglet — voir src/components/ExamLockGuard.jsx pour l'usage.

const LOCK_KEY = "mos_official_exam_lock";
const STALE_BUFFER_SEC = 5 * 60; // filet de sécurité si l'onglet d'origine plante

export function acquireExamLock(cin, durationSec) {
  try {
    localStorage.setItem(
      LOCK_KEY,
      JSON.stringify({ cin, expiresAt: Date.now() + (durationSec + STALE_BUFFER_SEC) * 1000 })
    );
  } catch {
    // ignore (navigation privée, stockage désactivé, etc.)
  }
}

export function releaseExamLock() {
  try {
    localStorage.removeItem(LOCK_KEY);
  } catch {
    // ignore
  }
}

export function getActiveExamLock() {
  try {
    const lock = JSON.parse(localStorage.getItem(LOCK_KEY));
    if (!lock) return null;
    if (Date.now() > lock.expiresAt) {
      localStorage.removeItem(LOCK_KEY);
      return null;
    }
    return lock;
  } catch {
    return null;
  }
}
