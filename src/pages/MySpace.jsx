import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStudentByCin } from "../lib/students";
import { getAttemptsByCin } from "../lib/storage";
import { EXAMS, PASS_PCT } from "../lib/exams";
import Brand from "../components/Brand";

function getStoredAccess() {
  try {
    return JSON.parse(sessionStorage.getItem("mos_student_access"));
  } catch {
    return null;
  }
}

export default function MySpace() {
  const [cin, setCin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [student, setStudent] = useState(getStoredAccess);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    let active = true;
    setLoading(true);
    getAttemptsByCin(student.cin).then((data) => {
      if (active) { setAttempts(data); setLoading(false); }
    });
    return () => { active = false; };
  }, [student]);

  async function login() {
    const trimmed = cin.trim();
    if (!trimmed) return;
    setChecking(true);
    setError("");
    const found = await getStudentByCin(trimmed);
    setChecking(false);
    if (!found) {
      setError("Aucun stagiaire trouvé avec ce CIN. Vérifiez votre saisie ou contactez votre formateur.");
      return;
    }
    sessionStorage.setItem("mos_student_access", JSON.stringify(found));
    setStudent(found);
  }

  function logout() {
    sessionStorage.removeItem("mos_student_access");
    setStudent(null);
    setAttempts([]);
    setCin("");
  }

  if (!student) {
    return (
      <div className="login-wrap">
        <div className="login-stack">
          <Brand />
          <div className="card login-card">
            <div className="login-head">
              <div className="eyebrow">Espace Stagiaire</div>
              <h1>Mon espace</h1>
              <p>Saisissez votre CIN pour consulter l'historique de vos tentatives.</p>
            </div>
            <div className="login-body">
              <div className="field">
                <label htmlFor="my-cin">CIN (carte d'identité nationale)</label>
                <input
                  id="my-cin"
                  value={cin}
                  onChange={(e) => setCin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && login()}
                  placeholder="Ex. : AB123456"
                  autoFocus
                />
                {error && (
                  <p style={{ marginTop: 6, fontSize: 12.5, color: "var(--red)" }}>{error}</p>
                )}
              </div>
              <button className="btn" disabled={!cin.trim() || checking} onClick={login}>
                {checking ? "Recherche…" : "Voir mes résultats"}
              </button>
              <div className="admin-link">
                <Link to="/">← Retour à l'accueil</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const n = attempts.length;
  const avg = n ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / n * 10) / 10 : 0;
  const best = n ? Math.max(...attempts.map((a) => a.score)) : 0;

  return (
    <div className="admin-wrap">
      <div className="admin-head">
        <div className="admin-head-title">
          <Brand compact />
          <div>
            <h1>🎓 Mon espace</h1>
            <p style={{ fontSize: 13, color: "var(--grey)", marginTop: 2 }}>
              {student.nom} {student.groupe ? `— ${student.groupe}` : ""}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn danger" onClick={logout}>Changer de CIN</button>
          <Link className="btn" to="/">Accueil</Link>
        </div>
      </div>

      <div className="kpis">
        <div className="card stat"><div className="k">Tentatives</div><div className="v">{n}</div></div>
        <div className="card stat"><div className="k">Score moyen</div><div className="v">{avg}%</div></div>
        <div className="card stat"><div className="k">Meilleur score</div><div className="v">{best}%</div></div>
      </div>

      <h2 className="section-title">Historique de mes tentatives</h2>
      <div className="card table-card">
        {loading ? (
          <div className="empty">Chargement de vos résultats…</div>
        ) : n === 0 ? (
          <div className="empty">
            Aucune tentative enregistrée pour l'instant.<br />
            <small>Vos résultats apparaîtront ici après votre premier entraînement.</small>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Épreuve</th>
                <th>Score</th>
                <th>Verdict</th>
                <th>Durée</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a, i) => (
                <tr key={i} style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                  <td>{new Date(a.ts).toLocaleString("fr-FR")}</td>
                  <td>{a.examLabel || EXAMS[a.examId]?.short || "—"}</td>
                  <td style={{ fontWeight: 700, color: "var(--heading)" }}>{a.score}%</td>
                  <td><span className={`badge ${a.passed ? "pass" : "fail"}`}>{a.passed ? "Réussi" : "Échec"}</span></td>
                  <td>{Math.floor(a.durationSec / 60)} min {a.durationSec % 60} s</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p style={{ marginTop: 16, fontSize: 13, color: "var(--grey)" }}>
        ℹ️ Seuil de réussite : {PASS_PCT} %.
      </p>
    </div>
  );
}
