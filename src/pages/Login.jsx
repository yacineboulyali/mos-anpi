import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EXAMS, DEFAULT_EXAM, buildBank, DURATION_MIN, PASS_PCT } from "../lib/exams";
import { getDeviceInfo, getConnectionInfo } from "../lib/device";
import { getExamSettings } from "../lib/examSettings";
import { getStudentByCin, upsertStudent } from "../lib/students";
import { ESTABLISHMENTS_WITH_OTHER, OTHER_OPTION } from "../lib/establishments";
import { getEstablishmentNames } from "../lib/establishmentsAdmin";
import Brand from "../components/Brand";

const ALL_ENABLED = Object.fromEntries(Object.keys(EXAMS).map((id) => [id, true]));

const CIN_STATUS_TEXT = {
  checking: "Recherche…",
  found: "✔ Stagiaire reconnu — vos informations ont été retrouvées.",
  switched: "✔ Stagiaire reconnu — établissement mis à jour automatiquement.",
  new: "Nouveau stagiaire — complétez vos informations ci-dessous.",
};

const CIN_LOOKUP_DEBOUNCE_MS = 400;

export default function Login() {
  const [etablissement, setEtablissement] = useState(ESTABLISHMENTS_WITH_OTHER[0]);
  const [etablissementOptions, setEtablissementOptions] = useState(ESTABLISHMENTS_WITH_OTHER);
  const [cin, setCin] = useState("");
  const [cinStatus, setCinStatus] = useState("idle"); // idle | checking | found | new
  const [visitorMode, setVisitorMode] = useState(false);
  const [nom, setNom] = useState("");
  const [groupe, setGroupe] = useState("");
  const [examId, setExamId] = useState(DEFAULT_EXAM);
  const [examEnabled, setExamEnabled] = useState(ALL_ENABLED);
  const nav = useNavigate();
  const lookupToken = useRef(0);
  const lookupTimer = useRef(null);
  const { TOTAL } = buildBank(examId);
  const exam = EXAMS[examId];
  const availableIds = Object.keys(EXAMS).filter((id) => examEnabled[id]);
  const noExamAvailable = availableIds.length === 0;
  const cinResolved = cinStatus === "found" || cinStatus === "switched" || cinStatus === "new";
  const isCinFlow = cinResolved && !visitorMode;
  const showDetails = visitorMode || cinResolved;

  useEffect(() => {
    let active = true;
    getEstablishmentNames().then((names) => {
      if (active) setEtablissementOptions([...names, OTHER_OPTION]);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    getExamSettings(etablissement).then((settings) => {
      if (!active) return;
      setExamEnabled(settings);
      if (!settings[examId]) {
        const firstAvailable = Object.keys(EXAMS).find((id) => settings[id]);
        if (firstAvailable) setExamId(firstAvailable);
      }
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etablissement]);

  function clearLookupTimer() {
    if (lookupTimer.current) {
      clearTimeout(lookupTimer.current);
      lookupTimer.current = null;
    }
  }

  useEffect(() => clearLookupTimer, []);

  function changeEtablissement(value) {
    lookupToken.current++; // annule toute recherche CIN en cours pour l'ancien établissement
    clearLookupTimer();
    setEtablissement(value);
    setCin("");
    setCinStatus("idle");
    setVisitorMode(false);
    setNom("");
    setGroupe("");
  }

  function changeCin(value) {
    setCin(value);
    if (visitorMode) setVisitorMode(false);
    if (cinStatus !== "idle" && cinStatus !== "checking") setCinStatus("idle");
  }

  function continueAsVisitor() {
    clearLookupTimer();
    setCin("");
    setCinStatus("idle");
    setVisitorMode(true);
    setNom("");
    setGroupe("");
  }

  // Recherche en direct pendant la saisie (onKeyUp), avec un léger anti-rebond
  // pour éviter une requête à chaque frappe.
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
    if (token !== lookupToken.current) return; // une saisie plus récente a pris le relais
    if (student) {
      setNom(student.nom || "");
      setGroupe(student.groupe || "");
      // Le stagiaire est reconnu par son CIN quel que soit l'établissement
      // affiché : on aligne automatiquement la liste déroulante sur le sien.
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

  const canStart = showDetails && nom.trim();

  const start = () => {
    if (!canStart || noExamAvailable) return;
    const identity = {
      cin: isCinFlow ? cin.trim().toUpperCase() : null,
      nom: nom.trim(),
      groupe: groupe.trim(),
      etablissement,
    };
    if (isCinFlow) upsertStudent(identity).catch(() => {});
    sessionStorage.setItem(
      "mos_candidate",
      JSON.stringify({
        ...identity,
        examId,
        device: getDeviceInfo(),
        connectionType: getConnectionInfo(),
        startedAt: Date.now(),
      })
    );
    nav("/exam");
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
            <div>Entraînement — Session Juillet 2026</div>
            <h1>QCM {exam.title}</h1>
            <p>Préparez l'examen de fin de formation dans les conditions réelles.</p>
          </div>
          <div className="login-body">
            <div className="field">
              <label htmlFor="etablissement">Établissement</label>
              <select
                id="etablissement"
                value={etablissement}
                onChange={(e) => changeEtablissement(e.target.value)}
              >
                {etablissementOptions.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            {!visitorMode && (
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
                      marginTop: 6,
                      fontSize: 12.5,
                      color: cinStatus === "found" || cinStatus === "switched" ? "var(--good)" : "var(--grey)",
                    }}
                  >
                    {CIN_STATUS_TEXT[cinStatus]}
                  </p>
                )}
                <button type="button" className="btn grey btn-sm" onClick={continueAsVisitor} style={{ marginTop: 6 }}>
                  Continuer comme visiteur
                </button>
              </div>
            )}

            {visitorMode && (
              <div className="field">
                <p style={{ marginTop: 0, fontSize: 12.5, color: "var(--grey)" }}>
                  Mode visiteur —{" "}
                  <button type="button" className="about-trigger" onClick={() => setVisitorMode(false)}>
                    saisir un CIN
                  </button>
                </p>
              </div>
            )}

            {showDetails && (
              <>
                <div className="field">
                  <label htmlFor="nom">Nom complet</label>
                  <input
                    id="nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && start()}
                    placeholder="Ex. : Karim Alami"
                    autoFocus={visitorMode}
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
                {Object.values(EXAMS).map((e) => (
                  <button
                    type="button"
                    key={e.id}
                    disabled={!examEnabled[e.id]}
                    className={`exam-choice-btn ${examId === e.id ? "active" : ""}`}
                    style={{ "--btn-accent": e.color }}
                    onClick={() => setExamId(e.id)}
                    title={examEnabled[e.id] ? undefined : "Indisponible pour le moment"}
                  >
                    {e.short}
                  </button>
                ))}
              </div>
              {noExamAvailable && (
                <p style={{ marginTop: 8, fontSize: 13, color: "var(--red)" }}>
                  Aucune épreuve n'est disponible pour le moment. Contactez votre formateur.
                </p>
              )}
            </div>
            <div className="login-meta">
              <span><span className="dot" />{TOTAL} questions</span>
              <span><span className="dot" />{DURATION_MIN} minutes</span>
              <span><span className="dot" />Seuil : {PASS_PCT} %</span>
            </div>
            <button className="btn" onClick={start} disabled={!canStart || noExamAvailable}>
              Commencer l'entraînement
            </button>
            <div className="admin-link">
              <Link to="/mon-espace">Mon espace (stagiaire)</Link>
              {" · "}
              <Link to="/admin">Espace Administration</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
