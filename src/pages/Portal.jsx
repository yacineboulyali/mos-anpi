import { useEffect } from "react";
import { Link } from "react-router-dom";
import ofpptLogo from "../assets/ofppt-logo.png";
import anpiLogo from "../assets/anpi-logo.png";

export default function Portal() {
  useEffect(() => {
    document.title = "منصة التدريب والامتحانات الرقمية";
  }, []);

  return (
    <main className="portal" dir="rtl">
      <div className="portal-orbit portal-orbit-one" aria-hidden="true" />
      <div className="portal-orbit portal-orbit-two" aria-hidden="true" />

      <header className="portal-intro">
        <span className="portal-kicker">فضاء التكوين والتطوير المهني</span>
        <h1>منصة التدريب والامتحانات الرقمية</h1>
        <p>
          اختر فضاءك للولوج إلى بنك الأسئلة، التدرب في ظروف قريبة من الامتحان،
          ومتابعة تقدمك خطوة بخطوة.
        </p>
      </header>

      <section className="portal-choices" aria-label="اختيار فضاء التدريب">
        <Link className="portal-choice portal-choice-ofppt" to="/ofppt">
          <span className="portal-choice-ring" aria-hidden="true">
            <img src={ofpptLogo} alt="" />
          </span>
          <span className="portal-choice-copy">
            <span className="portal-choice-label">فضاء OFPPT</span>
            <strong>اختبارات MOS</strong>
            <span>Excel · Word · PowerPoint</span>
          </span>
          <span className="portal-choice-arrow" aria-hidden="true">←</span>
        </Link>

        <Link className="portal-choice portal-choice-anpi" to="/anpi">
          <span className="portal-choice-ring" aria-hidden="true">
            <img src={anpiLogo} alt="" />
          </span>
          <span className="portal-choice-copy">
            <span className="portal-choice-label">فضاء ANPI</span>
            <strong>الامتحان المهني</strong>
            <span>لأساتذة المعلوميات</span>
          </span>
          <span className="portal-choice-arrow" aria-hidden="true">←</span>
        </Link>
      </section>

      <p className="portal-footnote">اختر الشعار للدخول إلى فضاء التدريب الخاص بك</p>
    </main>
  );
}
