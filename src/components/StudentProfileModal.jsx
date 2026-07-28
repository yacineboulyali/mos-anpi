import { useEffect } from "react";
import { EXAMS } from "../lib/exams";
import { OFFICIAL_MAX_NOTE, scoreToNote } from "../lib/officialExam";

export default function StudentProfileModal({ student, attempts, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sorted = [...attempts].sort((a, b) => b.ts - a.ts);
  const n = sorted.length;
  const avg = n ? Math.round(sorted.reduce((s, a) => s + a.score, 0) / n * 10) / 10 : 0;
  const best = n ? Math.max(...sorted.map((a) => a.score)) : 0;

  return (
    <div className="about-overlay" onClick={onClose}>
      <div className="card about-modal student-modal" onClick={(e) => e.stopPropagation()}>
        <button className="about-close" onClick={onClose} aria-label="Fermer">✕</button>
        <div className="student-modal-head">
          <h2>{student.nom}</h2>
          <p>
            {student.cin ? `CIN ${student.cin} — ` : ""}
            {student.groupe ? `${student.groupe} — ` : ""}
            {student.etablissement || "—"}
          </p>
        </div>

        <div className="kpis" style={{ marginBottom: "1.25rem" }}>
          <div className="card stat"><div className="k">Tentatives</div><div className="v">{n}</div></div>
          <div className="card stat"><div className="k">Score moyen</div><div className="v">{avg}%</div></div>
          <div className="card stat"><div className="k">Meilleur score</div><div className="v">{best}%</div></div>
        </div>

        {n === 0 ? (
          <div className="empty">Aucune tentative enregistrée pour ce stagiaire.</div>
        ) : (
          <div className="table-card">
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
                {sorted.map((a, i) => (
                  <tr key={i}>
                    <td>{new Date(a.ts).toLocaleString("fr-FR")}</td>
                    <td>{a.examLabel || EXAMS[a.examId]?.short || "—"}</td>
                    <td style={{ fontWeight: 700, color: "var(--heading)" }}>
                      {a.kind === "official" ? `${scoreToNote(a.score)} / ${OFFICIAL_MAX_NOTE}` : `${a.score}%`}
                    </td>
                    <td><span className={`badge ${a.passed ? "pass" : "fail"}`}>{a.passed ? "Réussi" : "Échec"}</span></td>
                    <td>{Math.floor(a.durationSec / 60)} min {a.durationSec % 60} s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
