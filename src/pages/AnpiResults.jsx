import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import anpiLogo from "../assets/anpi-logo.png";
import { ANPI_LETTERS, ANPI_PASS_PCT } from "../lib/anpiExam";
import { playSound } from "../lib/sounds";

export default function AnpiResults() {
  const result = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("anpi_last_result")); } catch { return null; }
  }, []);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    document.title = "ANPI — نتيجة التدريب";
    if (result) playSound(result.passed ? "success" : "fail");
  }, [result]);

  if (!result) {
    return (
      <main className="results-wrap anpi-training" dir="rtl">
        <section className="card score-hero">
          <p>لا توجد نتيجة لعرضها.</p>
          <div className="actions-row"><Link className="btn" to="/anpi">العودة إلى فضاء ANPI</Link></div>
        </section>
      </main>
    );
  }

  const ringColor = result.passed ? "#1B8A5A" : "#B33A3A";
  const detailById = Object.fromEntries(result.detail.map((item) => [item.id, item]));

  return (
    <main className="results-wrap anpi-training" dir="rtl" style={{ "--accent": "#DDA232", "--accent-dark": "#292E4B" }}>
      <div className="results-top anpi-results-brand">
        <img src={anpiLogo} alt="شعار ANPI" />
        <div><strong>ANPI</strong><span>نتيجة الاختبار المهني التجريبي</span></div>
      </div>
      <section className="card score-hero">
        <div className="eyebrow">نموذج تجريبي غير رسمي</div>
        <h1>{result.candidate.name}</h1>
        <div className="score-ring" style={{ background: `conic-gradient(${ringColor} ${result.score * 3.6}deg, var(--line) 0deg)` }}>
          <div className="inner"><div><div className="score-val">{result.score}%</div><div className="score-sub">{result.correct} / {result.total} صحيحة</div></div></div>
        </div>
        <div className={`verdict ${result.passed ? "pass" : "fail"}`}>
          {result.passed ? "اجتزت النموذج بنجاح" : "تحتاج إلى مزيد من التدريب"} — العتبة {ANPI_PASS_PCT}%
        </div>
      </section>

      <div className="results-grid">
        <div className="card stat"><div className="k">المدة</div><div className="v">{Math.floor(result.durationSec / 60)} د {result.durationSec % 60} ث</div></div>
        <div className="card stat"><div className="k">الأسئلة المجاب عنها</div><div className="v">{Object.keys(result.answers).length} / {result.total}</div></div>
      </div>

      <h2 className="section-title">النتيجة حسب المحور</h2>
      <div className="card">
        {result.perDomain.map((domain) => {
          const percentage = Math.round((domain.correct / domain.total) * 100);
          return (
            <div className="domain-row" key={domain.domain}>
              <span className="name">{domain.domain}</span>
              <span className="mini-track"><span className="mini-fill" style={{ width: `${percentage}%`, display: "block" }} /></span>
              <span className="pct">{percentage}%</span>
            </div>
          );
        })}
      </div>

      <div className="actions-row">
        <button className="btn gold" onClick={() => setShowReview((value) => !value)}>{showReview ? "إخفاء التصحيح" : "عرض التصحيح"}</button>
        <Link className="btn ghost" to="/anpi">تدريب جديد</Link>
        <Link className="btn ghost" to="/">اختيار فضاء آخر</Link>
      </div>

      {showReview && (
        <section className="anpi-review">
          <h2 className="section-title">التصحيح التفصيلي</h2>
          {result.questions.map((question, questionIndex) => {
            const detail = detailById[question.id];
            return (
              <article className="card review-q" key={question.id}>
                <span className="domain-tag">{question.domain}</span>
                <div className="q-text"><span className="q-num">س{questionIndex + 1}.</span> {question.q}</div>
                <div className="opts">
                  {question.opts.map((option, optionIndex) => {
                    let className = "opt";
                    if (optionIndex === question.ans) className += " good";
                    else if (detail.given === optionIndex) className += " bad";
                    return <div className={className} key={option}><span className="letter">{ANPI_LETTERS[optionIndex]}</span><span>{option}</span></div>;
                  })}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
