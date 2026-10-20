import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EXAMS, DEFAULT_EXAM, buildBank, PASS_PCT, LETTERS } from "../lib/exams";
import { playSound } from "../lib/sounds";
import Brand from "../components/Brand";

export default function Results() {
  const data = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("mos_last_result")); } catch { return null; }
  }, []);
  const [showReview, setShowReview] = useState(false);
  const [onlyErrors, setOnlyErrors] = useState(true);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!data) return;
    const target = data.attempt.score;
    const start = performance.now();
    const duration = 900;
    let raf;
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayScore(Math.round(target * eased * 10) / 10);
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data]);

  useEffect(() => {
    if (!data) return;
    playSound(data.attempt.passed ? "success" : "fail");
  }, [data]);

  if (!data) {
    return (
      <div className="results-wrap">
        <div className="card score-hero">
          <p>Aucun résultat à afficher.</p>
          <div className="actions-row">
            <Link className="btn" to="/ofppt">Retour à l'accueil</Link>
          </div>
        </div>
      </div>
    );
  }

  const { attempt, detail, questions } = data;
  const FLAT = questions && questions.length ? questions : buildBank(attempt.examId).FLAT;
  const exam = EXAMS[attempt.examId] || EXAMS[DEFAULT_EXAM];
  const deg = displayScore * 3.6;
  const ringColor = attempt.passed ? "#1B8A5A" : "#B33A3A";
  const detailById = Object.fromEntries(detail.map((d) => [d.id, d]));
  const reviewList = FLAT.filter((q) => !onlyErrors || !detailById[q.id]?.ok);

  return (
    <div className="results-wrap" style={{ "--accent": exam.color, "--accent-dark": exam.colorDark }}>
      <div className="results-top">
        <Brand />
      </div>
      <div className="card score-hero">
        <div className="eyebrow">Résultat de l'entraînement — {attempt.examLabel || "MOS"}</div>
        <h1 style={{ margin: "0.5rem 0 0.25rem", color: "var(--heading)" }}>
          {attempt.nom} — {attempt.groupe}
        </h1>
        {attempt.etablissement && (
          <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--grey)" }}>{attempt.etablissement}</p>
        )}
        <div
          className="score-ring"
          style={{ background: `conic-gradient(${ringColor} ${deg}deg, var(--line) ${deg}deg)` }}
        >
          <div className="inner">
            <div>
              <div className="score-val">{displayScore}%</div>
              <div className="score-sub">{attempt.correct} / {attempt.total} bonnes réponses</div>
            </div>
          </div>
        </div>
        <div className={`verdict ${attempt.passed ? "pass" : "fail"}`}>
          {attempt.passed ? "✔ Réussi" : "✘ Échec"} — seuil {PASS_PCT} %
        </div>
      </div>

      <div className="results-grid">
        <div className="card stat" style={{ animationDelay: "60ms" }}>
          <div className="k">Durée</div>
          <div className="v">{Math.floor(attempt.durationSec / 60)} min {attempt.durationSec % 60} s</div>
        </div>
        <div className="card stat" style={{ animationDelay: "140ms" }}>
          <div className="k">Questions répondues</div>
          <div className="v">{Object.keys(attempt.answers).length} / {attempt.total}</div>
        </div>
        <div className="card stat" style={{ animationDelay: "220ms" }}>
          <div className="k">Verdict</div>
          <div className="v" style={{ color: ringColor }}>{attempt.passed ? "Réussi" : "Échec"}</div>
        </div>
      </div>

      <h2 className="section-title">Score par domaine</h2>
      <div className="card">
        {attempt.perDomain.map((d, i) => {
          const pct = Math.round((d.correct / d.total) * 100);
          return (
            <div className="domain-row" key={d.domain} style={{ animationDelay: `${i * 60}ms` }}>
              <span className="name">{d.domain}</span>
              <span className="mini-track"><span className="mini-fill" style={{ width: `${pct}%`, display: "block", animationDelay: `${150 + i * 60}ms` }} /></span>
              <span className="pct">{pct}%</span>
            </div>
          );
        })}
      </div>

      <div className="actions-row">
        <button className="btn gold" onClick={() => setShowReview((s) => !s)}>
          {showReview ? "Masquer la correction" : "Voir la correction"}
        </button>
        <Link className="btn ghost" to="/ofppt">Nouvel entraînement</Link>
      </div>

      {showReview && (
        <>
          <h2 className="section-title">Correction détaillée</h2>
          <div style={{ marginBottom: "0.875rem" }}>
            <label style={{ fontSize: "0.875rem", display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={onlyErrors}
                onChange={(e) => setOnlyErrors(e.target.checked)}
              />
              Afficher uniquement mes erreurs
            </label>
          </div>
          {reviewList.length === 0 && (
            <div className="card empty">Aucune erreur — excellent travail ! 🎉</div>
          )}
          {reviewList.map((q) => {
            const d = detailById[q.id];
            const num = FLAT.indexOf(q) + 1;
            return (
              <div className="card review-q" key={q.id}>
                <span className="domain-tag" style={{ marginBottom: "0.625rem" }}>{q.domain}</span>
                <div className="q-text"><span className="q-num">Q{num}.</span> {q.q}</div>
                <div className="opts">
                  {q.opts.map((o, i) => {
                    let cls = "opt";
                    if (i === q.ans) cls += " good";
                    else if (d.given === i) cls += " bad";
                    return (
                      <div className={cls} key={i}>
                        <span className="letter">{LETTERS[i]}</span>
                        <span>{o}</span>
                      </div>
                    );
                  })}
                </div>
                {d.given === null && (
                  <p style={{ marginTop: "0.625rem", fontSize: "0.8125rem", color: "var(--grey)" }}>Question sans réponse.</p>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
