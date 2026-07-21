import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildBank, shuffleExam, DURATION_MIN, PASS_PCT, LETTERS } from "../lib/exams";
import { saveAttempt } from "../lib/storage";
import { playSound } from "../lib/sounds";
import Brand from "../components/Brand";

function fmt(s) {
  const m = Math.floor(s / 60), r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export default function Exam() {
  const nav = useNavigate();
  const candidate = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("mos_candidate")); } catch { return null; }
  }, []);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [left, setLeft] = useState(DURATION_MIN * 60);
  const submitted = useRef(false);

  const bank = useMemo(
    () => (candidate ? buildBank(candidate.examId) : null),
    [candidate]
  );
  const shuffledFlat = useMemo(
    () => (bank ? shuffleExam(bank.FLAT) : []),
    [bank]
  );

  useEffect(() => {
    if (!candidate) nav("/", { replace: true });
  }, [candidate, nav]);

  useEffect(() => {
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (left === 0 && !submitted.current) submit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  if (!candidate) return null;

  const { exam, DOMAINS, TOTAL } = bank;
  const FLAT = shuffledFlat;
  const q = FLAT[idx];
  const answered = Object.keys(answers).length;
  const given = answers[q.id];
  const isRevealed = !!revealed[q.id];

  function choose(i) {
    playSound("click");
    setAnswers((a) => ({ ...a, [q.id]: i }));
  }

  function goNext() {
    if (given !== undefined && !isRevealed) {
      playSound(given === q.ans ? "correct" : "incorrect");
      setRevealed((r) => ({ ...r, [q.id]: true }));
      return;
    }
    playSound("click");
    if (idx < TOTAL - 1) setIdx(idx + 1);
    else submit(false);
  }

  function goTo(i) {
    playSound("click");
    setIdx(i);
  }

  function submit(auto = false) {
    if (submitted.current) return;
    if (!auto) {
      const missing = TOTAL - Object.keys(answers).length;
      const msg = missing > 0
        ? `Il reste ${missing} question(s) sans réponse. Soumettre quand même ?`
        : "Soumettre vos réponses ?";
      if (!window.confirm(msg)) return;
    }
    submitted.current = true;
    playSound("submit");

    let correct = 0;
    const perDomain = DOMAINS.map((d) => ({ domain: d.domain, correct: 0, total: d.questions.length }));
    const detail = FLAT.map((fq) => {
      const given = answers[fq.id] ?? null;
      const ok = given === fq.ans;
      if (ok) { correct++; perDomain[fq.domainIndex].correct++; }
      return { id: fq.id, given, ok };
    });

    const score = Math.round((correct / TOTAL) * 1000) / 10;
    const attempt = {
      ts: Date.now(),
      cin: candidate.cin,
      nom: candidate.nom,
      groupe: candidate.groupe,
      etablissement: candidate.etablissement,
      device: candidate.device,
      connectionType: candidate.connectionType,
      examId: exam.id,
      examLabel: exam.short,
      score,
      correct,
      total: TOTAL,
      passed: score >= PASS_PCT,
      durationSec: DURATION_MIN * 60 - left,
      perDomain,
      answers,
    };
    saveAttempt(attempt).catch(() => {});
    sessionStorage.setItem("mos_last_result", JSON.stringify({ attempt, detail, questions: FLAT }));
    nav("/results", { replace: true });
  }

  return (
    <div className="exam-wrap" style={{ "--accent": exam.color, "--accent-dark": exam.colorDark }}>
      <div className="exam-top">
        <Brand compact />
        <div className="exam-top-chips">
          <span className="candidate-chip" style={{ borderColor: exam.color, color: exam.colorDark }}>📘 {exam.short}</span>
          <span
            className="candidate-chip candidate-chip-id"
            title={`${candidate.nom} — ${candidate.groupe}${candidate.etablissement ? ` · ${candidate.etablissement}` : ""}`}
          >
            👤 {candidate.nom} — {candidate.groupe}{candidate.etablissement ? ` · ${candidate.etablissement}` : ""}
          </span>
          <span className="candidate-chip">Question {idx + 1} / {TOTAL}</span>
        </div>
      </div>

      <span className="domain-tag" key={`tag-${q.id}`}>{q.domain}</span>

      <div className="card q-card" key={q.id}>
        <div className="q-text">
          <span className="q-num">Q{idx + 1}.</span> {q.q}
        </div>
        <div className="opts">
          {q.opts.map((o, i) => {
            let cls = "opt";
            if (isRevealed) {
              if (i === q.ans) cls += " good";
              else if (i === given) cls += " bad";
            } else if (i === given) {
              cls += " sel";
            }
            return (
              <button
                key={i}
                className={cls}
                style={{ animationDelay: `${i * 45}ms` }}
                onClick={() => choose(i)}
              >
                <span className="letter">{LETTERS[i]}</span>
                <span>{o}</span>
              </button>
            );
          })}
        </div>
        {isRevealed && (
          <div className={`feedback ${given === q.ans ? "correct" : "incorrect"}`}>
            {given === q.ans
              ? "✔ Bonne réponse !"
              : `✘ Incorrect — la bonne réponse est ${LETTERS[q.ans]}.`}
          </div>
        )}
      </div>

      <div className="exam-bar">
        <div className="exam-bar-inner">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(answered / TOTAL) * 100}%` }} />
          </div>
          <div className="bar-row">
            <span className={`timer ${left < 300 ? "low" : ""}`}>⏱ {fmt(left)}</span>
            <div className="q-dots">
              {FLAT.map((fq, i) => (
                <button
                  key={fq.id}
                  className={`q-dot ${answers[fq.id] !== undefined ? "answered" : ""} ${i === idx ? "current" : ""}`}
                  onClick={() => goTo(i)}
                  aria-label={`Question ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="bar-actions">
              <button className="bar-btn" disabled={idx === 0} onClick={() => goTo(idx - 1)}>← Précédent</button>
              {idx < TOTAL - 1 ? (
                <button className="bar-btn" onClick={goNext}>
                  {given !== undefined && !isRevealed ? "Vérifier" : "Suivant →"}
                </button>
              ) : (
                <button className="bar-btn submit" onClick={goNext}>
                  {given !== undefined && !isRevealed ? "Vérifier" : "Soumettre"}
                </button>
              )}
            </div>
          </div>
          <div className="bar-row">
            <span className="bar-meta">{answered} / {TOTAL} réponses données</span>
            <button className="bar-btn submit" onClick={() => submit(false)}>Soumettre l'épreuve</button>
          </div>
        </div>
      </div>
    </div>
  );
}
