import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import anpiLogo from "../assets/anpi-logo.png";
import { ANPI_DURATION_MIN, ANPI_PASS_PCT, buildAnpiBank } from "../lib/anpiExam";

const FEATURES = [
  {
    icon: "◷",
    title: "محاكاة زمنية",
    text: "تدريب منظم في ظروف قريبة من الامتحان المهني الحقيقي.",
  },
  {
    icon: "✓",
    title: "تصحيح واضح",
    text: "عرض النتيجة والأجوبة الصحيحة بعد إنهاء كل تدريب.",
  },
  {
    icon: "↗",
    title: "تتبّع التقدم",
    text: "قياس تطور المستوى وتحديد المحاور التي تحتاج إلى مراجعة.",
  },
];

export default function AnpiHome() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const { total } = buildAnpiBank();

  useEffect(() => {
    document.title = "ANPI — التدريب على الامتحان المهني";
  }, []);

  function startTraining() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    sessionStorage.setItem("anpi_candidate", JSON.stringify({ name: trimmedName, startedAt: Date.now() }));
    sessionStorage.removeItem("anpi_last_result");
    navigate("/anpi/exam");
  }

  return (
    <main className="anpi-page" dir="rtl">
      <header className="anpi-nav">
        <a className="anpi-brand" href="https://www.anpi.ma/" target="_blank" rel="noreferrer">
          <img src={anpiLogo} alt="شعار الجمعية الوطنية لأساتذة المعلوميات" />
          <span>
            <strong>ANPI</strong>
            <small>الجمعية الوطنية لأساتذة المعلوميات</small>
          </span>
        </a>
        <Link className="anpi-back" to="/">العودة إلى البوابة</Link>
      </header>

      <section className="anpi-hero">
        <div className="anpi-hero-copy">
          <span className="anpi-eyebrow">منصة رقمية لفائدة أستاذات وأساتذة المعلوميات</span>
          <h1>التدريب على الامتحان المهني لأساتذة المعلوميات</h1>
          <p>
            بنك أسئلة تفاعلي يساعدك على الاستعداد، تقييم معارفك، والتدرب وفق
            نماذج الامتحانات المهنية المعتمدة.
          </p>
          <div className="anpi-status" role="status">
            <span className="anpi-status-dot" aria-hidden="true" />
            نموذج تجريبي جاهز — الأسئلة غير رسمية ومخصصة لاختبار المنصة
          </div>
        </div>

        <div className="anpi-emblem" aria-hidden="true">
          <div className="anpi-emblem-halo" />
          <img src={anpiLogo} alt="" />
          <span>التكوين المستمر<br />والارتقاء المهني</span>
        </div>
      </section>

      <section className="anpi-bank" aria-labelledby="anpi-bank-title">
        <div className="anpi-section-heading">
          <div>
            <span>بنك الأسئلة</span>
            <h2 id="anpi-bank-title">اختر نموذج التدريب</h2>
          </div>
          <span className="anpi-coming-soon">نسخة تجريبية</span>
        </div>

        <article className="anpi-bank-card">
          <div className="anpi-bank-number">01</div>
          <div>
            <span className="anpi-bank-tag">الامتحان المهني</span>
            <h3>نماذج أساتذة المعلوميات</h3>
            <p>اختبار تجريبي متعدد الاختيارات في الديداكتيك، التقويم، الأمن الرقمي والتدبير التربوي.</p>
            <div className="anpi-training-meta">
              <span>{total} سؤالًا</span>
              <span>{ANPI_DURATION_MIN} دقيقة</span>
              <span>عتبة النجاح {ANPI_PASS_PCT}%</span>
            </div>
            <div className="anpi-name-field">
              <label htmlFor="anpi-name">الاسم الكامل</label>
              <input
                id="anpi-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && startTraining()}
                placeholder="اكتب اسمك لبدء التدريب"
                autoComplete="name"
              />
            </div>
          </div>
          <button type="button" disabled={!name.trim()} onClick={startTraining}>
            ابدأ التدريب
          </button>
        </article>
      </section>

      <section className="anpi-features" aria-label="مزايا منصة التدريب">
        {FEATURES.map((feature) => (
          <article key={feature.title}>
            <span aria-hidden="true">{feature.icon}</span>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </article>
        ))}
      </section>

      <footer className="anpi-footer">
        <span>ANPI · الجمعية الوطنية لأساتذة المعلوميات بالمغرب</span>
        <a href="https://www.anpi.ma/" target="_blank" rel="noreferrer">زيارة الموقع الرسمي</a>
      </footer>
    </main>
  );
}
