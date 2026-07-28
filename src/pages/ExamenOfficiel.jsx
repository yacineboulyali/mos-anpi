import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildBank, LETTERS } from "../lib/exams";
import { OFFICIAL_DURATION_MIN, OFFICIAL_PASS_PCT, pickOfficialQuestions } from "../lib/officialExam";
import { saveAttempt } from "../lib/storage";
import { saveExamProgress, getExamProgress, clearExamProgress } from "../lib/examProgress";
import { playSound } from "../lib/sounds";
import { acquireExamLock, releaseExamLock } from "../lib/examLock";
import Brand from "../components/Brand";

const PROGRESS_SAVE_DEBOUNCE_MS = 700;

function fmt(s) {
  const m = Math.floor(s / 60), r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export default function ExamenOfficiel() {
  const nav = useNavigate();
  const candidate = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("mos_official_candidate")); } catch { return null; }
  }, []);

  const [flat, setFlat] = useState(null);
  const [endsAt, setEndsAt] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [left, setLeft] = useState(null);
  const submitted = useRef(false);
  const saveTimer = useRef(null);
  const latest = useRef({});

  const bank = useMemo(
    () => (candidate ? buildBank(candidate.examId) : null),
    [candidate]
  );
  const TOTAL = flat ? flat.length : 0;

  useEffect(() => {
    if (!candidate) nav("/examen", { replace: true });
  }, [candidate, nav]);

  // Reprend la progression déjà enregistrée pour ce candidat sur cette
  // épreuve (mêmes questions déjà tirées, mêmes réponses) si elle existe,
  // sinon tire un nouveau jeu de questions et l'enregistre aussitôt : voir
  // src/lib/examProgress.js.
  useEffect(() => {
    if (!candidate || !bank) return;
    let active = true;
    getExamProgress(candidate.cin, bank.exam.id).then((saved) => {
      if (!active) return;
      if (saved && saved.questions?.length) {
        setFlat(saved.questions);
        setAnswers(saved.answers || {});
        setIdx(Math.min(saved.currentIndex || 0, saved.questions.length - 1));
        setEndsAt(saved.endsAt);
      } else {
        const questions = pickOfficialQuestions(bank.FLAT);
        const ends = Date.now() + OFFICIAL_DURATION_MIN * 60 * 1000;
        setFlat(questions);
        setEndsAt(ends);
        saveExamProgress({
          cin: candidate.cin,
          examId: bank.exam.id,
          nom: candidate.nom,
          groupe: candidate.groupe,
          etablissement: candidate.etablissement,
          device: candidate.device,
          connectionType: candidate.connectionType,
          questions,
          answers: {},
          currentIndex: 0,
          attemptNumber: candidate.attemptNumber,
          startedAt: candidate.startedAt || Date.now(),
          endsAt: ends,
        }).catch(() => {});
      }
    });
    return () => { active = false; };
  }, [candidate, bank]);

  // Verrouille l'appareil sur cette épreuve (empêche l'ouverture d'une autre
  // page du site tant que l'examen officiel est en cours) : voir ExamLockGuard.
  // N'est posé qu'une fois la date de fin connue, pour refléter le temps
  // réellement restant (utile en cas de reprise).
  useEffect(() => {
    if (!candidate || !endsAt) return;
    const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
    acquireExamLock(candidate.cin, remaining);
    return () => releaseExamLock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate, endsAt]);

  // Le temps restant est dérivé d'une date de fin absolue : il continue de
  // s'écouler même si le candidat ferme l'onglet et revient plus tard.
  useEffect(() => {
    if (!endsAt) return;
    function tick() { setLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000))); }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  useEffect(() => {
    if (left === 0 && !submitted.current) submit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  latest.current = { candidate, bank, flat, answers, idx, endsAt };

  function flushProgress(nextAnswers, nextIdx) {
    const { candidate: c, bank: b, flat: f, endsAt: e } = latest.current;
    if (!c || !b || !f || submitted.current) return;
    saveExamProgress({
      cin: c.cin,
      examId: b.exam.id,
      nom: c.nom,
      groupe: c.groupe,
      etablissement: c.etablissement,
      device: c.device,
      connectionType: c.connectionType,
      questions: f,
      answers: nextAnswers,
      currentIndex: nextIdx,
      attemptNumber: c.attemptNumber,
      startedAt: c.startedAt || Date.now(),
      endsAt: e,
    }).catch(() => {});
  }

  function persistProgress(nextAnswers, nextIdx) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flushProgress(nextAnswers, nextIdx), PROGRESS_SAVE_DEBOUNCE_MS);
  }

  // Filet de sécurité : si le candidat quitte l'onglet avant la fin du délai
  // du debounce (fermeture, changement d'onglet), on sauvegarde tout de suite.
  useEffect(() => {
    function onHide() {
      if (document.visibilityState !== "hidden") return;
      if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
      const { answers: a, idx: i } = latest.current;
      flushProgress(a, i);
    }
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  if (!candidate || !bank || !flat || left === null) return null;

  const q = flat[idx];
  const answered = Object.keys(answers).length;
  const given = answers[q.id];

  function choose(i) {
    playSound("click");
    setAnswers((a) => {
      const next = { ...a, [q.id]: i };
      persistProgress(next, idx);
      return next;
    });
  }

  function goNext() {
    playSound("click");
    if (idx < TOTAL - 1) {
      const next = idx + 1;
      setIdx(next);
      persistProgress(answers, next);
    } else submit(false);
  }

  function goTo(i) {
    playSound("click");
    setIdx(i);
    persistProgress(answers, i);
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
    if (saveTimer.current) clearTimeout(saveTimer.current);
    playSound("submit");

    let correct = 0;
    const detail = flat.map((fq) => {
      const g = answers[fq.id] ?? null;
      const ok = g === fq.ans;
      if (ok) correct++;
      return { id: fq.id, given: g, ok };
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
      examId: bank.exam.id,
      examLabel: bank.exam.short,
      score,
      correct,
      total: TOTAL,
      passed: score >= OFFICIAL_PASS_PCT,
      durationSec: OFFICIAL_DURATION_MIN * 60 - left,
      perDomain: null,
      answers,
      kind: "official",
    };
    saveAttempt(attempt).catch(() => {});
    clearExamProgress(candidate.cin, bank.exam.id).catch(() => {});
    sessionStorage.setItem(
      "mos_last_official_result",
      JSON.stringify({ attempt, detail, attemptNumber: candidate.attemptNumber })
    );
    releaseExamLock();
    nav("/examen/resultat", { replace: true });
  }

  return (
    <div className="exam-wrap" style={{ "--accent": bank.exam.color, "--accent-dark": bank.exam.colorDark }}>
      <div className="exam-top">
        <Brand compact />
        <div className="exam-top-chips">
          <span className="candidate-chip" style={{ borderColor: bank.exam.color, color: bank.exam.colorDark }}>📝 {bank.exam.short}</span>
          <span
            className="candidate-chip candidate-chip-id"
            title={`${candidate.nom} — ${candidate.groupe}${candidate.etablissement ? ` · ${candidate.etablissement}` : ""}`}
          >
            👤 {candidate.nom} — {candidate.groupe}{candidate.etablissement ? ` · ${candidate.etablissement}` : ""}
          </span>
          <span className="candidate-chip">Question {idx + 1} / {TOTAL}</span>
        </div>
      </div>

      <div className="card q-card" key={q.id}>
        <div className="q-text">
          <span className="q-num">Q{idx + 1}.</span> {q.q}
        </div>
        <div className="opts">
          {q.opts.map((o, i) => (
            <button
              key={i}
              className={`opt ${i === given ? "sel" : ""}`}
              style={{ animationDelay: `${i * 45}ms` }}
              onClick={() => choose(i)}
            >
              <span className="letter">{LETTERS[i]}</span>
              <span>{o}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="exam-bar">
        <div className="exam-bar-inner">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(answered / TOTAL) * 100}%` }} />
          </div>
          <div className="bar-row">
            <span className={`timer ${left < 300 ? "low" : ""}`}>⏱ {fmt(left)}</span>
            <div className="q-dots">
              {flat.map((fq, i) => (
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
                <button className="bar-btn" onClick={goNext}>Valider →</button>
              ) : (
                <button className="bar-btn submit" onClick={() => submit(false)}>Soumettre</button>
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
