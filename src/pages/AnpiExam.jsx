import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import anpiLogo from "../assets/anpi-logo.png";
import {
  ANPI_DURATION_MIN,
  ANPI_LETTERS,
  ANPI_PASS_PCT,
  buildAnpiBank,
  shuffleAnpiBank,
} from "../lib/anpiExam";
import { playSound } from "../lib/sounds";

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function AnpiExam() {
  const navigate = useNavigate();
  const candidate = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("anpi_candidate")); } catch { return null; }
  }, []);
  const bank = useMemo(() => buildAnpiBank(), []);
  const questions = useMemo(() => shuffleAnpiBank(bank.flat), [bank.flat]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(ANPI_DURATION_MIN * 60);
  const submitted = useRef(false);

  useEffect(() => {
    document.title = "ANPI — اختبار تجريبي";
    if (!candidate) navigate("/anpi", { replace: true });
  }, [candidate, navigate]);

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0 && !submitted.current) submit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  if (!candidate) return null;

  const question = questions[index];
  const given = answers[question.id];
  const isRevealed = !!revealed[question.id];
  const answeredCount = Object.keys(answers).length;

  function choose(answerIndex) {
    if (isRevealed) return;
    playSound("click");
    setAnswers((current) => ({ ...current, [question.id]: answerIndex }));
  }

  function next() {
    if (given !== undefined && !isRevealed) {
      playSound(given === question.ans ? "correct" : "incorrect");
      setRevealed((current) => ({ ...current, [question.id]: true }));
      return;
    }
    if (index < bank.total - 1) setIndex(index + 1);
    else submit(false);
  }

  function submit(automatic = false) {
    if (submitted.current) return;
    if (!automatic) {
      const missing = bank.total - Object.keys(answers).length;
      const message = missing
        ? `بقي ${missing} سؤالًا دون جواب. هل تريد إنهاء الاختبار؟`
        : "هل تريد إنهاء الاختبار وعرض النتيجة؟";
      if (!window.confirm(message)) return;
    }
    submitted.current = true;
    playSound("submit");
    let correct = 0;
    const perDomain = bank.domains.map((domain) => ({ domain: domain.domain, correct: 0, total: domain.questions.length }));
    const detail = questions.map((item) => {
      const selected = answers[item.id] ?? null;
      const ok = selected === item.ans;
      if (ok) {
        correct += 1;
        perDomain[item.domainIndex].correct += 1;
      }
      return { id: item.id, given: selected, ok };
    });
    const score = Math.round((correct / bank.total) * 1000) / 10;
    const result = {
      candidate,
      score,
      correct,
      total: bank.total,
      passed: score >= ANPI_PASS_PCT,
      durationSec: ANPI_DURATION_MIN * 60 - secondsLeft,
      perDomain,
      answers,
      detail,
      questions,
    };
    sessionStorage.setItem("anpi_last_result", JSON.stringify(result));
    navigate("/anpi/results", { replace: true });
  }

  return (
    <main className="exam-wrap anpi-training" dir="rtl" style={{ "--accent": "#DDA232", "--accent-dark": "#292E4B" }}>
      <div className="exam-top anpi-exam-top">
        <div className="anpi-exam-brand">
          <img src={anpiLogo} alt="شعار ANPI" />
          <span><strong>ANPI</strong><small>اختبار مهني تجريبي</small></span>
        </div>
        <div className="exam-top-chips">
          <span className="candidate-chip">المترشح: {candidate.name}</span>
          <span className="candidate-chip">السؤال {index + 1} / {bank.total}</span>
          <span className={`candidate-chip anpi-timer ${secondsLeft < 300 ? "low" : ""}`}>⏱ {formatTime(secondsLeft)}</span>
        </div>
      </div>

      <div className="anpi-demo-notice">نموذج تجريبي غير رسمي لاختبار آلية التدريب</div>
      <span className="domain-tag">{question.domain}</span>

      <section className="card q-card" key={question.id}>
        <div className="q-text"><span className="q-num">س{index + 1}.</span> {question.q}</div>
        <div className="opts">
          {question.opts.map((option, optionIndex) => {
            let className = "opt";
            if (isRevealed) {
              if (optionIndex === question.ans) className += " good";
              else if (optionIndex === given) className += " bad";
            } else if (optionIndex === given) className += " sel";
            return (
              <button key={option} className={className} onClick={() => choose(optionIndex)} disabled={isRevealed}>
                <span className="letter">{ANPI_LETTERS[optionIndex]}</span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>
        {isRevealed && (
          <div className={`feedback ${given === question.ans ? "correct" : "incorrect"}`}>
            {given === question.ans ? "إجابة صحيحة" : `إجابة غير صحيحة — الجواب الصحيح هو ${ANPI_LETTERS[question.ans]}.`}
          </div>
        )}
      </section>

      <div className="exam-bar anpi-exam-bar">
        <div className="exam-bar-inner">
          <div className="progress-track"><div className="progress-fill" style={{ width: `${(answeredCount / bank.total) * 100}%` }} /></div>
          <div className="bar-row">
            <span className="bar-meta">تمت الإجابة عن {answeredCount} من {bank.total}</span>
            <div className="bar-actions">
              <button className="bar-btn" disabled={index === 0} onClick={() => setIndex(index - 1)}>السابق</button>
              <button className="bar-btn submit" disabled={given === undefined && !isRevealed} onClick={next}>
                {given !== undefined && !isRevealed ? "تحقق من الجواب" : index === bank.total - 1 ? "إنهاء" : "التالي"}
              </button>
            </div>
          </div>
          <div className="q-dots anpi-q-dots">
            {questions.map((item, itemIndex) => (
              <button
                key={item.id}
                className={`q-dot ${answers[item.id] !== undefined ? "answered" : ""} ${itemIndex === index ? "current" : ""}`}
                onClick={() => setIndex(itemIndex)}
                aria-label={`السؤال ${itemIndex + 1}`}
              >{itemIndex + 1}</button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
