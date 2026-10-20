import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSession, hasResults, logoutCandidate, logoutStaff, logoutStudent } from "../lib/session";
import { EXAMS } from "../lib/exams";
import ThemeToggle from "./ThemeToggle";

export default function NavDrawer() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState({ type: "guest" });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Masqué pendant l'examen officiel : aucune navigation ne doit être
  // possible tant que l'épreuve est en cours (voir ExamLockGuard).
  if (location.pathname === "/" || location.pathname.startsWith("/anpi") || location.pathname === "/examen/epreuve") return null;

  function openDrawer() {
    setSession(getSession());
    setOpen(true);
  }

  function go(path) {
    const inExam = location.pathname === "/exam" || location.pathname === "/examen/epreuve";
    if (inExam && path !== location.pathname) {
      if (!window.confirm("Quitter l'épreuve en cours ? Votre progression sera perdue.")) return;
    }
    setOpen(false);
    navigate(path);
  }

  function logout() {
    if (session.type === "staff") logoutStaff();
    else if (session.type === "candidate") logoutCandidate();
    else if (session.type === "student") logoutStudent();
    setOpen(false);
    navigate("/ofppt");
  }

  return (
    <>
      <button type="button" className="hamburger-trigger" onClick={openDrawer} aria-label="Ouvrir le menu">
        ☰
      </button>
      {open && (
        <div className="drawer-overlay" onClick={() => setOpen(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="drawer-close" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>

            <div className="drawer-profile">
              {session.type === "candidate" && (
                <>
                  <div className="drawer-avatar">👤</div>
                  <div className="drawer-name">{session.nom}</div>
                  <div className="drawer-sub">
                    {session.groupe ? `${session.groupe} — ` : ""}{session.etablissement}
                  </div>
                  {session.examId && EXAMS[session.examId] && (
                    <div className="drawer-badge">{EXAMS[session.examId].short}</div>
                  )}
                </>
              )}
              {session.type === "staff" && (
                <>
                  <div className="drawer-avatar">🏫</div>
                  <div className="drawer-name">Espace Administration</div>
                  <div className="drawer-sub">{session.etablissement}</div>
                </>
              )}
              {session.type === "student" && (
                <>
                  <div className="drawer-avatar">🎓</div>
                  <div className="drawer-name">{session.nom}</div>
                  <div className="drawer-sub">
                    {session.groupe ? `${session.groupe} — ` : ""}{session.etablissement}
                  </div>
                </>
              )}
              {session.type === "guest" && (
                <div className="drawer-sub">Non connecté</div>
              )}
            </div>

            <nav className="drawer-nav">
              <button type="button" onClick={() => go("/ofppt")}>🏠 Accueil OFPPT</button>
              <button type="button" onClick={() => go("/")}>↔ Choisir un espace</button>
              {session.type === "candidate" && hasResults() && (
                <button type="button" onClick={() => go("/results")}>📊 Résultats</button>
              )}
              {session.type === "staff" && (
                <button type="button" onClick={() => go("/admin")}>📊 Tableau de bord</button>
              )}
              {session.type === "student" && (
                <button type="button" onClick={() => go("/mon-espace")}>🎓 Mon espace</button>
              )}
              {(session.type === "guest" || session.type === "candidate") && (
                <button type="button" onClick={() => go("/examen")}>📝 Examen officiel</button>
              )}
              {session.type === "guest" && (
                <>
                  <button type="button" onClick={() => go("/mon-espace")}>🎓 Mon espace</button>
                  <button type="button" onClick={() => go("/admin")}>🔑 Espace Administration</button>
                </>
              )}
              <ThemeToggle />
            </nav>

            {session.type !== "guest" && (
              <button type="button" className="btn danger drawer-logout" onClick={logout}>
                Se déconnecter
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
