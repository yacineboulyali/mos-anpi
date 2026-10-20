import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EXAMS } from "../lib/exams";
import {
  OFFICIAL_EXAM_IDS, OFFICIAL_QUESTION_COUNT, OFFICIAL_DURATION_MIN, OFFICIAL_MAX_ATTEMPTS,
  OFFICIAL_MAX_NOTE, OFFICIAL_PASS_NOTE, scoreToNote,
} from "../lib/officialExam";
import { getDeviceInfo, getConnectionInfo } from "../lib/device";
import { getExamSettings } from "../lib/examSettings";
import { getStudentByCin, upsertStudent } from "../lib/students";
import { getOfficialAttemptStats } from "../lib/storage";
import { getExamProgress } from "../lib/examProgress";
import { ESTABLISHMENTS_WITH_OTHER, OTHER_OPTION } from "../lib/establishments";
import { getEstablishmentNames } from "../lib/establishmentsAdmin";
import Brand from "../components/Brand";

const ALL_ENABLED = Object.fromEntries(OFFICIAL_EXAM_IDS.map((id) => [id, true]));

const CIN_STATUS_TEXT = {
  checking: "Recherche…",
  found: "✔ Stagiaire reconnu — vos informations ont été retrouvées.",
  switched: "✔ Stagiaire reconnu — établissement mis à jour automatiquement.",
  new: "Nouveau stagiaire — complétez vos informations ci-dessous.",
};

const CIN_LOOKUP_DEBOUNCE_MS = 400;

export default function ExamenLogin() {
  const [etablissement, setEtablissement] = useState(ESTABLISHMENTS_WITH_OTHER[0]);
  const [etablissementOptions, setEtablissementOptions] = useState(ESTABLISHMENTS_WITH_OTHER);
  const [cin, setCin] = useState("");
  const [cinStatus, setCinStatus] = useState("idle"); // idle | checking | found | new
  const [nom, setNom] = useState("");
  const [groupe, setGroupe] = useState("");
  const [examId, setExamId] = useState(OFFICIAL_EXAM_IDS[0]);
  const [examEnabled, setExamEnabled] = useState(ALL_ENABLED);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [reuseSession, setReuseSession] = useState(false);
  const nav = useNavigate();
  const lookupToken = useRef(0);
  const lookupTimer = useRef(null);
  const exam = EXAMS[examId];
  const availableIds = OFFICIAL_EXAM_IDS.filter((id) => examEnabled[id]);
  const noExamAvailable = availableIds.length === 0;
  const cinResolved = cinStatus === "found" || cinStatus === "switched" || cinStatus === "new";

  useEffect(() => {
    let active = true;
    getEstablishmentNames().then((names) => {
      if (active) setEtablissementOptions([...names, OTHER_OPTION]);
    });
    return () => { active = false; };
  }, []);

  // Garde le CIN/l'identité en session d'une tentative à l'autre (repasser
  // l'examen sans ressaisir son CIN) : voir ExamenResultat "Repasser l'examen".
  useEffect(() => {
    let existing = null;
    try { existing = JSON.parse(sessionStorage.getItem("mos_official_candidate")); } catch { /* ignore */ }
    if (!existing?.cin || !existing?.nom) return;
    setEtablissement(existing.etablissement || ESTABLISHMENTS_WITH_OTHER[0]);
    setNom(existing.nom || "");
    setGroupe(existing.groupe || "");
    if (existing.examId) setExamId(existing.examId);
    setCin(existing.cin);
    setCinStatus("found");
    setReuseSession(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    getExamSettings(etablissement).then((settings) => {
      if (!active) return;
      setExamEnabled(settings);
      if (!settings[examId]) {
        const firstAvailable = OFFICIAL_EXAM_IDS.find((id) => settings[id]);
        if (firstAvailable) setExamId(firstAvailable);
      }
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etablissement]);

  // Dès que le CIN est identifié et l'épreuve choisie, on vérifie le quota
  // de tentatives officielles déjà utilisées pour cette épreuve précise.
  useEffect(() => {
    if (!cinResolved || !cin.trim()) { setStats(null); return; }
    let active = true;
    setStatsLoading(true);
    getOfficialAttemptStats(cin.trim(), examId).then((s) => {
      if (active) { setStats(s); setStatsLoading(false); }
    });
    return () => { active = false; };
  }, [cinResolved, cin, examId]);

  // Une épreuve laissée en cours (onglet fermé, coupure réseau...) sans
  // avoir été soumise doit pouvoir être reprise telle quelle : voir
  // src/lib/examProgress.js et ExamenOfficiel "Reprend la progression...".
  useEffect(() => {
    if (!cinResolved || !cin.trim()) { setProgress(null); return; }
    let active = true;
    setProgressLoading(true);
    getExamProgress(cin.trim(), examId).then((p) => {
      if (active) { setProgress(p); setProgressLoading(false); }
    });
    return () => { active = false; };
  }, [cinResolved, cin, examId]);

  function clearLookupTimer() {
    if (lookupTimer.current) {
      clearTimeout(lookupTimer.current);
      lookupTimer.current = null;
    }
  }

  useEffect(() => clearLookupTimer, []);

  function changeCin(value) {
    setCin(value);
    if (cinStatus !== "idle" && cinStatus !== "checking") setCinStatus("idle");
  }

  function switchIdentity() {
    clearLookupTimer();
    setReuseSession(false);
    setCin("");
    setCinStatus("idle");
    setNom("");
    setGroupe("");
  }

  function scheduleLookup(value) {
    clearLookupTimer();
    const trimmed = value.trim();
    if (!trimmed) { setCinStatus("idle"); return; }
    lookupTimer.current = setTimeout(() => lookupCin(trimmed), CIN_LOOKUP_DEBOUNCE_MS);
  }

  async function lookupCin(value) {
    const trimmed = (value ?? cin).trim();
    if (!trimmed) { setCinStatus("idle"); return; }
    const token = ++lookupToken.current;
    setCinStatus("checking");
    const student = await getStudentByCin(trimmed);
    if (token !== lookupToken.current) return;
    if (student) {
      setNom(student.nom || "");
      setGroupe(student.groupe || "");
      if (student.etablissement && student.etablissement !== etablissement) {
        setEtablissement(student.etablissement);
        setCinStatus("switched");
      } else {
        setCinStatus("found");
      }
    } else {
      setNom("");
      setGroupe("");
      setCinStatus("new");
    }
  }

  const quotaReached = !!stats && stats.count >= OFFICIAL_MAX_ATTEMPTS;
  const canStart = cinResolved && nom.trim() && !statsLoading && !quotaReached;

  const start = () => {
    if (noExamAvailable) return;
    if (progress) { resumeProgress(); return; }
    if (!canStart) return;
    const identity = {
      cin: cin.trim().toUpperCase(),
      nom: nom.trim(),
      groupe: groupe.trim(),
      etablissement,
    };
    upsertStudent(identity).catch(() => {});
    sessionStorage.setItem(
      "mos_official_candidate",
      JSON.stringify({
        ...identity,
        examId,
        attemptNumber: (stats?.count || 0) + 1,
        device: getDeviceInfo(),
        connectionType: getConnectionInfo(),
        startedAt: Date.now(),
      })
    );
    nav("/examen/epreuve");
  };

  // Reprend une épreuve laissée en cours : mêmes CIN/épreuve/tentative que
  // lorsqu'elle a démarré, pour qu'ExamenOfficiel retrouve la progression
  // enregistrée plutôt que de tirer un nouveau jeu de questions.
  const resumeProgress = () => {
    const identity = {
      cin: cin.trim().toUpperCase(),
      nom: nom.trim() || progress.nom || "",
      groupe: groupe.trim() || progress.groupe || "",
      etablissement,
    };
    upsertStudent(identity).catch(() => {});
    sessionStorage.setItem(
      "mos_official_candidate",
      JSON.stringify({
        ...identity,
        examId,
        attemptNumber: progress.attemptNumber,
        device: getDeviceInfo(),
        connectionType: getConnectionInfo(),
        startedAt: progress.startedAt,
      })
    );
    nav("/examen/epreuve");
  };

  return (
    <div className="login-wrap">
      <div className="login-stack">
        <Brand />
        <div
          className="card login-card"
          style={{ "--accent": exam.color, "--accent-dark": exam.colorDark }}
        >
          <div className="login-head">
            <div>Examen officiel</div>
            <h1>QCM {exam.title}</h1>
            <p>{OFFICIAL_QUESTION_COUNT} questions · {OFFICIAL_DURATION_MIN} minutes · {OFFICIAL_MAX_ATTEMPTS} tentatives maximum.</p>
          </div>
          <div className="login-body">
            {reuseSession && (
              <div className="field">
                <p style={{ marginTop: 0, fontSize: "0.78125rem", color: "var(--grey)" }}>
                  ✔ Session active — connecté en tant que <strong>{nom}</strong> —{" "}
                  <button type="button" className="about-trigger" onClick={switchIdentity}>
                    ce n'est pas moi
                  </button>
                </p>
              </div>
            )}

            {!reuseSession && (
              <div className="field">
                <label htmlFor="cin">CIN (carte d'identité nationale)</label>
                <input
                  id="cin"
                  value={cin}
                  onChange={(e) => changeCin(e.target.value)}
                  onKeyUp={(e) => e.key !== "Enter" && scheduleLookup(e.target.value)}
                  onBlur={() => lookupCin()}
                  onKeyDown={(e) => e.key === "Enter" && lookupCin()}
                  placeholder="Ex. : AB123456"
                  autoFocus
                />
                {cinStatus !== "idle" && (
                  <p
                    style={{
                      marginTop: "0.375rem",
                      fontSize: "0.78125rem",
                      color: cinStatus === "found" || cinStatus === "switched" ? "var(--good)" : "var(--grey)",
                    }}
                  >
                    {CIN_STATUS_TEXT[cinStatus]}
                  </p>
                )}
              </div>
            )}

            {cinResolved && (
              <>
                <div className="field">
                  <label htmlFor="etablissement">Établissement</label>
                  <select
                    id="etablissement"
                    value={etablissement}
                    onChange={(e) => setEtablissement(e.target.value)}
                  >
                    {etablissementOptions.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="nom">Nom complet</label>
                  <input
                    id="nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && start()}
                    placeholder="Ex. : Karim Alami"
                  />
                </div>
                <div className="field">
                  <label htmlFor="groupe">Groupe</label>
                  <input
                    id="groupe"
                    value={groupe}
                    onChange={(e) => setGroupe(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && start()}
                    placeholder="Ex. : Groupe A"
                  />
                </div>
              </>
            )}

            <div className="field">
              <label>Épreuve</label>
              <div className="exam-choice">
                {OFFICIAL_EXAM_IDS.map((id) => {
                  const e = EXAMS[id];
                  return (
                    <button
                      type="button"
                      key={id}
                      disabled={!examEnabled[id]}
                      className={`exam-choice-btn ${examId === id ? "active" : ""}`}
                      style={{ "--btn-accent": e.color }}
                      onClick={() => setExamId(id)}
                      title={examEnabled[id] ? undefined : "Indisponible pour le moment"}
                    >
                      {e.short}
                    </button>
                  );
                })}
              </div>
              {noExamAvailable && (
                <p style={{ marginTop: "0.5rem", fontSize: "0.8125rem", color: "var(--red)" }}>
                  Aucune épreuve n'est disponible pour le moment. Contactez votre formateur.
                </p>
              )}
            </div>

            {cinResolved && (statsLoading || progressLoading) && (
              <p style={{ fontSize: "0.8125rem", color: "var(--grey)" }}>Vérification de vos tentatives…</p>
            )}
            {cinResolved && progress && !progressLoading && (
              <p style={{ fontSize: "0.8125rem", color: "var(--heading)", fontWeight: 600 }}>
                ⏳ Une épreuve est déjà en cours pour vous (tentative {progress.attemptNumber} / {OFFICIAL_MAX_ATTEMPTS}).
                Cliquez sur « Reprendre l'examen en cours » pour continuer là où vous vous étiez arrêté — le temps continue de s'écouler.
              </p>
            )}
            {cinResolved && !progress && stats && !statsLoading && !progressLoading && (
              <p style={{ fontSize: "0.8125rem", color: quotaReached ? "var(--red)" : "var(--grey)" }}>
                {quotaReached
                  ? `Vous avez utilisé vos ${OFFICIAL_MAX_ATTEMPTS} tentatives pour cette épreuve. Contactez votre formateur.`
                  : `Tentative ${stats.count + 1} / ${OFFICIAL_MAX_ATTEMPTS}${stats.count > 0 ? ` — meilleure note actuelle : ${scoreToNote(stats.bestScore)}/${OFFICIAL_MAX_NOTE}` : ""}.`}
              </p>
            )}

            <div className="login-meta">
              <span><span className="dot" />{OFFICIAL_QUESTION_COUNT} questions</span>
              <span><span className="dot" />{OFFICIAL_DURATION_MIN} minutes</span>
              <span><span className="dot" />Seuil : {OFFICIAL_PASS_NOTE}/{OFFICIAL_MAX_NOTE}</span>
            </div>
            <button className="btn" onClick={start} disabled={noExamAvailable || (!progress && !canStart)}>
              {progress ? "Reprendre l'examen en cours" : "Commencer l'examen"}
            </button>
            <div className="admin-link">
              <Link to="/ofppt">← Retour à l'accueil</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
