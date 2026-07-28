import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getActiveExamLock } from "../lib/examLock";

const EXAM_PATH = "/examen/epreuve";
const POLL_MS = 3000;

function readOfficialCandidate() {
  try { return JSON.parse(sessionStorage.getItem("mos_official_candidate")); } catch { return null; }
}

// Tant qu'un examen officiel est verrouillé (voir src/lib/examLock.js),
// empêche l'accès à toute autre page du site sur cet appareil : l'onglet qui
// a démarré l'examen est ramené dessus, tout autre onglet/fenêtre voit un
// écran de blocage (on ne peut pas le rediriger vers l'épreuve : il n'a pas
// la session du candidat, ce qui provoquerait une boucle de redirection).
export default function ExamLockGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    function check() {
      const lock = getActiveExamLock();
      if (!lock) { setBlocked(false); return; }
      if (location.pathname === EXAM_PATH) { setBlocked(false); return; }

      const candidate = readOfficialCandidate();
      if (candidate?.cin === lock.cin) {
        navigate(EXAM_PATH, { replace: true });
        setBlocked(false);
      } else {
        setBlocked(true);
      }
    }
    check();
    const t = setInterval(check, POLL_MS);
    return () => clearInterval(t);
  }, [location.pathname, navigate]);

  if (!blocked) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "var(--paper)", display: "grid", placeItems: "center",
        padding: "1.5rem", textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "26.25rem" }}>
        <h1 style={{ fontSize: "1.375rem", color: "var(--heading)", marginBottom: "0.625rem" }}>🔒 Examen officiel en cours</h1>
        <p style={{ color: "var(--grey)", fontSize: "0.875rem", lineHeight: 1.5 }}>
          Un examen officiel est en cours sur cet appareil. Terminez-le dans l'onglet
          où vous l'avez démarré avant d'accéder à une autre page.
        </p>
      </div>
    </div>
  );
}
