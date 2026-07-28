import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { OFFICIAL_MAX_ATTEMPTS, OFFICIAL_MAX_NOTE, OFFICIAL_PASS_NOTE, scoreToNote } from "../lib/officialExam";
import { getOfficialAttemptStats } from "../lib/storage";
import Brand from "../components/Brand";

export default function ExamenResultat() {
  const nav = useNavigate();
  const stored = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("mos_last_official_result")); } catch { return null; }
  }, []);
  const [best, setBest] = useState(null);

  useEffect(() => {
    if (!stored) { nav("/examen", { replace: true }); return; }
    let active = true;
    getOfficialAttemptStats(stored.attempt.cin, stored.attempt.examId).then((s) => {
      if (!active) return;
      setBest({
        score: Math.max(s.bestScore, stored.attempt.score),
        count: Math.max(s.count, stored.attemptNumber || 0),
      });
    });
    return () => { active = false; };
  }, [stored, nav]);

  if (!stored) return null;
  const { attempt, attemptNumber } = stored;
  const remaining = OFFICIAL_MAX_ATTEMPTS - (best?.count ?? attemptNumber ?? 0);

  return (
    <div className="results-wrap">
      <div className="results-top">
        <Brand />
      </div>
      <div className="card score-hero" style={{ "--accent": "var(--teal)" }}>
        <div
          className="score-ring"
          style={{ background: `conic-gradient(${attempt.passed ? "var(--good)" : "var(--red)"} ${attempt.score * 3.6}deg, var(--line) 0deg)` }}
        >
          <div className="inner">
            <div className="score-val">{scoreToNote(attempt.score)} / {OFFICIAL_MAX_NOTE}</div>
            <div className="score-sub">{attempt.correct} / {attempt.total} bonnes réponses</div>
          </div>
        </div>
        <div className={`verdict ${attempt.passed ? "pass" : "fail"}`}>
          {attempt.passed ? "✔ Épreuve réussie" : "✘ Épreuve non réussie"}
        </div>
      </div>

      <div className="results-grid">
        <div className="card stat">
          <div className="k">Épreuve</div>
          <div className="v">{attempt.examLabel}</div>
        </div>
        <div className="card stat">
          <div className="k">Tentative</div>
          <div className="v">{attemptNumber} / {OFFICIAL_MAX_ATTEMPTS}</div>
        </div>
        <div className="card stat">
          <div className="k">Meilleure note officielle</div>
          <div className="v">{best ? `${scoreToNote(best.score)} / ${OFFICIAL_MAX_NOTE}` : "…"}</div>
        </div>
        <div className="card stat">
          <div className="k">Tentatives restantes</div>
          <div className="v">{Math.max(0, remaining)}</div>
        </div>
        <div className="card stat">
          <div className="k">Seuil de réussite</div>
          <div className="v">{OFFICIAL_PASS_NOTE} / {OFFICIAL_MAX_NOTE}</div>
        </div>
      </div>

      <p style={{ fontSize: "0.84375rem", color: "var(--grey)", textAlign: "center", maxWidth: "28.75rem", margin: "0 auto" }}>
        La note retenue pour cette épreuve est votre <strong>meilleure</strong> tentative parmi les {OFFICIAL_MAX_ATTEMPTS} autorisées.
        Aucun détail des réponses n'est communiqué, conformément aux conditions de l'examen officiel.
      </p>

      <div className="actions-row">
        {remaining > 0 && (
          <Link className="btn" to="/examen">Repasser l'examen</Link>
        )}
        <Link className="btn ghost" to="/">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
