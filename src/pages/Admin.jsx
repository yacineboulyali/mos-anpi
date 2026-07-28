import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, BarChart, Bar, LabelList,
} from "recharts";
import * as XLSX from "xlsx";
import { getAttempts, clearAttempts, supabase } from "../lib/storage";
import { EXAMS, PASS_PCT } from "../lib/exams";
import { OFFICIAL_MAX_ATTEMPTS, OFFICIAL_MAX_NOTE, OFFICIAL_PASS_NOTE, OFFICIAL_PASS_PCT, scoreToNote } from "../lib/officialExam";
import { getExamSettings, setExamEnabled as saveExamEnabled } from "../lib/examSettings";
import { bulkUpsertStudents, getAllStudents, deleteStudents } from "../lib/students";
import { downloadStudentTemplate, parseStudentsFile, normalizeStudentsRows } from "../lib/studentImport";
import { getEstablishmentAccessList, addEstablishment, resolveAdminAccess } from "../lib/establishmentsAdmin";
import Brand from "../components/Brand";
import AboutModal from "../components/AboutModal";
import StudentProfileModal from "../components/StudentProfileModal";

function getStoredAccess() {
  try {
    return JSON.parse(sessionStorage.getItem("mos_admin_access"));
  } catch {
    return null;
  }
}

const ALL_ENABLED = Object.fromEntries(Object.keys(EXAMS).map((id) => [id, true]));
const PAGE_SIZE = 10;

// Tri + pagination réutilisés par les trois tableaux du tableau de bord.
function useTableState(defaultSortKey, defaultDir = "desc") {
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState(defaultDir);
  const [page, setPage] = useState(0);

  function toggleSort(key) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
    setPage(0);
  }

  return { sortKey, sortDir, page, setPage, toggleSort };
}

function sortAndPaginate(data, { sortKey, sortDir, page }, pageSize = PAGE_SIZE) {
  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === "string" ? av.localeCompare(bv, "fr") : av - bv;
    return sortDir === "asc" ? cmp : -cmp;
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const rows = sorted.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);
  return { rows, totalPages, page: clampedPage, total: sorted.length };
}

function SortableTh({ label, sortKey, state }) {
  const active = state.sortKey === sortKey;
  return (
    <th className="sortable-th" onClick={() => state.toggleSort(sortKey)}>
      {label}
      <span className={`sort-arrow ${active ? "active" : ""}`}>
        {active ? (state.sortDir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </th>
  );
}

function Pagination({ page, totalPages, total, onChange }) {
  if (total === 0) return null;
  return (
    <div className="pagination">
      <span className="pagination-meta">{total} résultat{total > 1 ? "s" : ""} — page {page + 1} / {totalPages}</span>
      <div className="pagination-actions">
        <button type="button" className="btn ghost" disabled={page === 0} onClick={() => onChange(page - 1)}>← Précédent</button>
        <button type="button" className="btn ghost" disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>Suivant →</button>
      </div>
    </div>
  );
}

export default function Admin() {
  const [code, setCode] = useState("");
  const [access, setAccess] = useState(getStoredAccess);
  const [showAbout, setShowAbout] = useState(false);
  const [search, setSearch] = useState("");
  const [groupe, setGroupe] = useState("Tous");
  const [examFilter, setExamFilter] = useState("Tous");
  const [modeFilter, setModeFilter] = useState("Tous");
  const [refresh, setRefresh] = useState(0);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examEnabled, setExamEnabled] = useState(ALL_ENABLED);
  const [savingExam, setSavingExam] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterSearch, setRosterSearch] = useState("");
  const [selectedCins, setSelectedCins] = useState(() => new Set());
  const [deletingStudents, setDeletingStudents] = useState(false);
  const [profile, setProfile] = useState(null);
  const [etabFilter, setEtabFilter] = useState("Tous");
  const [establishments, setEstablishments] = useState([]);
  const [establishmentsLoading, setEstablishmentsLoading] = useState(true);
  const [newEstName, setNewEstName] = useState("");
  const [newEstCode, setNewEstCode] = useState("");
  const [addingEst, setAddingEst] = useState(false);
  const [addEstError, setAddEstError] = useState(null);
  const [importTarget, setImportTarget] = useState("");
  const [superExamSettings, setSuperExamSettings] = useState({});
  const [savingSuperExam, setSavingSuperExam] = useState(null);
  const attemptsTable = useTableState("ts");
  const studentsTable = useTableState("last");
  const groupsTable = useTableState("attempts");
  const rosterTable = useTableState("nom", "asc");

  const ok = !!access;
  const isSuperAdmin = !!access?.isSuperAdmin;
  const examEtablissement = access?.etablissement;

  useEffect(() => {
    if (!ok) return;
    let active = true;
    setLoading(true);
    getAttempts().then((data) => {
      if (active) { setAttempts(data); setLoading(false); }
    });
    return () => { active = false; };
  }, [ok, refresh]);

  useEffect(() => {
    if (!ok || isSuperAdmin) return;
    let active = true;
    getExamSettings(examEtablissement).then((settings) => {
      if (active) setExamEnabled(settings);
    });
    return () => { active = false; };
  }, [ok, isSuperAdmin, examEtablissement, refresh]);

  useEffect(() => {
    if (!ok) return;
    let active = true;
    setRosterLoading(true);
    getAllStudents(isSuperAdmin ? undefined : access.etablissement).then((data) => {
      if (active) { setRoster(data); setRosterLoading(false); }
    });
    return () => { active = false; };
  }, [ok, isSuperAdmin, access, refresh]);

  useEffect(() => {
    if (!ok || !isSuperAdmin) return;
    let active = true;
    setEstablishmentsLoading(true);
    getEstablishmentAccessList().then((list) => {
      if (active) { setEstablishments(list); setEstablishmentsLoading(false); }
    });
    return () => { active = false; };
  }, [ok, isSuperAdmin, refresh]);

  useEffect(() => {
    if (!ok || !isSuperAdmin || establishments.length === 0) return;
    let active = true;
    Promise.all(
      establishments.map((e) => getExamSettings(e.etablissement).then((settings) => [e.etablissement, settings]))
    ).then((entries) => {
      if (active) setSuperExamSettings(Object.fromEntries(entries));
    });
    return () => { active = false; };
  }, [ok, isSuperAdmin, establishments]);

  async function toggleExam(examId) {
    const next = !examEnabled[examId];
    setSavingExam(examId);
    setExamEnabled((s) => ({ ...s, [examId]: next }));
    await saveExamEnabled(examId, examEtablissement, next);
    setSavingExam(null);
  }

  async function toggleSuperExam(examId, etablissement) {
    const next = !superExamSettings[etablissement]?.[examId];
    setSavingSuperExam(`${etablissement}:${examId}`);
    setSuperExamSettings((s) => ({ ...s, [etablissement]: { ...s[etablissement], [examId]: next } }));
    await saveExamEnabled(examId, etablissement, next);
    setSavingSuperExam(null);
  }

  async function bulkSetExam(examId, enabled) {
    setSavingSuperExam(`${examId}:bulk`);
    await Promise.all(establishments.map((e) => saveExamEnabled(examId, e.etablissement, enabled)));
    setSuperExamSettings((s) => {
      const next = { ...s };
      establishments.forEach((e) => {
        next[e.etablissement] = { ...next[e.etablissement], [examId]: enabled };
      });
      return next;
    });
    setSavingSuperExam(null);
  }

  async function handleAddEstablishment() {
    if (!newEstName.trim() || !newEstCode.trim() || addingEst) return;
    setAddingEst(true);
    setAddEstError(null);
    try {
      await addEstablishment(newEstName, newEstCode);
      setNewEstName("");
      setNewEstCode("");
      setRefresh((r) => r + 1);
    } catch (err) {
      setAddEstError(err.message);
    }
    setAddingEst(false);
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de réimporter le même fichier après correction
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const rows = await parseStudentsFile(file);
      const forceEtablissement = isSuperAdmin ? (importTarget || undefined) : access.etablissement;
      const { valid, errors } = normalizeStudentsRows(rows, { forceEtablissement });
      const withoutCin = valid.filter((r) => !r.cin);
      const { count } = await bulkUpsertStudents(valid);
      setImportResult({
        total: rows.length,
        imported: count,
        skippedNoCin: withoutCin.length,
        errors,
      });
      setRefresh((r) => r + 1);
    } catch (err) {
      setImportResult({ total: 0, imported: 0, skippedNoCin: 0, errors: [err.message] });
    }
    setImporting(false);
  }

  function toggleSelectStudent(cin) {
    setSelectedCins((prev) => {
      const next = new Set(prev);
      if (next.has(cin)) next.delete(cin);
      else next.add(cin);
      return next;
    });
  }

  function toggleSelectAllOnPage(rows) {
    const pageCins = rows.map((s) => s.cin).filter(Boolean);
    const allSelected = pageCins.length > 0 && pageCins.every((c) => selectedCins.has(c));
    setSelectedCins((prev) => {
      const next = new Set(prev);
      pageCins.forEach((c) => (allSelected ? next.delete(c) : next.add(c)));
      return next;
    });
  }

  async function handleDeleteSelected() {
    if (selectedCins.size === 0) return;
    if (!window.confirm(`Supprimer la fiche de ${selectedCins.size} stagiaire${selectedCins.size > 1 ? "s" : ""} sélectionné${selectedCins.size > 1 ? "s" : ""} ? Cette action est irréversible (l'historique des tentatives n'est pas affecté).`)) return;
    setDeletingStudents(true);
    await deleteStudents([...selectedCins]);
    setSelectedCins(new Set());
    setDeletingStudents(false);
    setRefresh((r) => r + 1);
  }

  async function login() {
    const resolved = await resolveAdminAccess(code);
    if (resolved) {
      sessionStorage.setItem("mos_admin_access", JSON.stringify(resolved));
      setAccess(resolved);
    } else {
      alert("Code incorrect.");
    }
  }

  if (!ok) {
    return (
      <div className="login-wrap">
        <div className="login-stack">
          <Brand />
          <div className="card login-card">
            <div className="login-head">
              <div className="eyebrow">Espace Administration</div>
              <h1>Tableau de bord</h1>
              <p>Saisissez le code d'accès pour consulter les résultats.</p>
            </div>
            <div className="login-body">
            <div className="field">
              <label htmlFor="code">Code d'accès</label>
              <input
                id="code"
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && login()}
                autoFocus
              />
            </div>
            <button className="btn" disabled={!code} onClick={login}>
              Accéder au tableau de bord
            </button>
            <div className="admin-link">
              <Link to="/">← Retour à l'accueil</Link>
              {" · "}
              <button type="button" className="about-trigger" onClick={() => setShowAbout(true)}>
                À propos
              </button>
            </div>
          </div>
          </div>
        </div>
        {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      </div>
    );
  }

  const scopedAttempts = isSuperAdmin
    ? (etabFilter === "Tous" ? attempts : attempts.filter((a) => a.etablissement === etabFilter))
    : attempts.filter((a) => a.etablissement === access.etablissement);

  function openStudentProfile(s) {
    const key = s.cin || s.nom;
    const studentAttempts = scopedAttempts.filter((a) => (a.cin || a.nom) === key);
    setProfile({
      student: { cin: s.cin, nom: s.nom, groupe: s.groupe, etablissement: s.etablissement || access.etablissement },
      attempts: studentAttempts,
    });
  }

  const etabOptions = ["Tous", ...new Set([
    ...establishments.map((e) => e.etablissement),
    ...attempts.map((a) => a.etablissement).filter(Boolean),
    ...roster.map((s) => s.etablissement).filter(Boolean),
  ])].sort((a, b) => (a === "Tous" ? -1 : b === "Tous" ? 1 : a.localeCompare(b, "fr")));

  const modeScopedAttempts = modeFilter === "Tous"
    ? scopedAttempts
    : scopedAttempts.filter((a) => (a.kind || "training") === (modeFilter === "Examen officiel" ? "official" : "training"));

  const groupes = ["Tous", ...new Set(modeScopedAttempts.map((a) => a.groupe))];
  const exams = ["Tous", ...new Set(modeScopedAttempts.map((a) => a.examLabel || "Excel 2016"))];
  const filtered = modeScopedAttempts.filter(
    (a) =>
      (groupe === "Tous" || a.groupe === groupe) &&
      (examFilter === "Tous" || (a.examLabel || "Excel 2016") === examFilter) &&
      (a.nom.toLowerCase().includes(search.toLowerCase()) ||
        (a.cin || "").toLowerCase().includes(search.toLowerCase()))
  );

  const n = filtered.length;
  const avg = n ? Math.round(filtered.reduce((s, a) => s + a.score, 0) / n * 10) / 10 : 0;
  const passRate = n ? Math.round((filtered.filter((a) => a.passed).length / n) * 100) : 0;
  const best = n ? Math.max(...filtered.map((a) => a.score)) : 0;
  const avgDurationSec = n ? Math.round(filtered.reduce((s, a) => s + a.durationSec, 0) / n) : 0;

  const studentKey = (a) => a.cin || a.nom;

  const studentMap = new Map();
  filtered.forEach((a) => {
    const key = studentKey(a);
    if (!studentMap.has(key)) {
      studentMap.set(key, { cin: a.cin, nom: a.nom, groupe: a.groupe, attempts: 0, totalScore: 0, best: 0, last: 0 });
    }
    const s = studentMap.get(key);
    s.attempts += 1;
    s.totalScore += a.score;
    s.best = Math.max(s.best, a.score);
    s.last = Math.max(s.last, a.ts);
  });
  const students = [...studentMap.values()]
    .map((s) => ({ ...s, avg: Math.round((s.totalScore / s.attempts) * 10) / 10 }))
    .sort((a, b) => b.last - a.last);

  const groupMap = new Map();
  filtered.forEach((a) => {
    const key = a.groupe || "—";
    if (!groupMap.has(key)) groupMap.set(key, { groupe: key, students: new Set(), attempts: 0, totalScore: 0, passed: 0 });
    const g = groupMap.get(key);
    g.students.add(studentKey(a));
    g.attempts += 1;
    g.totalScore += a.score;
    if (a.passed) g.passed += 1;
  });
  const groupStats = [...groupMap.values()]
    .map((g) => ({
      groupe: g.groupe,
      studentCount: g.students.size,
      attempts: g.attempts,
      avg: Math.round((g.totalScore / g.attempts) * 10) / 10,
      passRate: Math.round((g.passed / g.attempts) * 100),
    }))
    .sort((a, b) => b.attempts - a.attempts);

  const rosterFiltered = roster.filter(
    (s) =>
      (!isSuperAdmin || etabFilter === "Tous" || s.etablissement === etabFilter) &&
      (s.nom.toLowerCase().includes(rosterSearch.toLowerCase()) ||
        (s.cin || "").toLowerCase().includes(rosterSearch.toLowerCase()))
  );

  const attemptsPage = sortAndPaginate(filtered, attemptsTable);
  const studentsPage = sortAndPaginate(students, studentsTable);
  const groupsPage = sortAndPaginate(groupStats, groupsTable);
  const rosterPage = sortAndPaginate(rosterFiltered, rosterTable);

  const trendData = [...filtered]
    .sort((a, b) => a.ts - b.ts)
    .map((a, i) => ({
      i,
      date: new Date(a.ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      score: a.score,
    }));

  const passCount = filtered.filter((a) => a.passed).length;
  const passFailData = [
    { name: "Réussi", value: passCount },
    { name: "Échec", value: n - passCount },
  ];

  const groupChartData = groupStats.map((g) => ({ groupe: g.groupe, score: g.avg }));

  const isOfficialMode = modeFilter === "Examen officiel";
  const passThresholdLabel = isOfficialMode ? `>= ${OFFICIAL_PASS_NOTE}/${OFFICIAL_MAX_NOTE}` : `>= ${PASS_PCT} %`;
  const bestLabel = isOfficialMode ? `${scoreToNote(best)} / ${OFFICIAL_MAX_NOTE}` : `${best}%`;

  function exportCsv() {
    const rows = [
      ["Date", "Épreuve", "CIN", "Nom", "Groupe", "Établissement", "Appareil", "Connexion", "Score (%)", "Bonnes réponses", "Total", "Verdict", "Durée (s)"],
      ...filtered.map((a) => [
        new Date(a.ts).toLocaleString("fr-FR"),
        a.examLabel || "Excel 2016",
        a.cin || "", a.nom, a.groupe, a.etablissement || "", a.device || "", a.connectionType || "",
        a.score, a.correct, a.total,
        a.passed ? "Réussi" : "Échec", a.durationSec,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "resultats_qcm_mos_excel2016.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Bilan d'examen officiel au format Excel : une ligne par stagiaire, avec
  // la note retenue (la meilleure des tentatives, sur OFFICIAL_MAX_NOTE).
  // Reprend les memes filtres (groupe / epreuve / recherche) que le tableau
  // "Statistiques par stagiaire" affiche au-dessus.
  function exportExcelBilan() {
    const headers = ["CIN", "Nom complet", "Classe", "Note (/40)"];
    const rows = students.map((s) => [s.cin || "", s.nom, s.groupe || "", scoreToNote(s.best)]);
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    sheet["!cols"] = [{ wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 12 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Bilan examen");
    const suffix = examFilter !== "Tous" ? `_${examFilter.replace(/\s+/g, "_")}` : "";
    XLSX.writeFile(workbook, `bilan_examen_officiel${suffix}.xlsx`);
  }

  return (
    <div className="admin-wrap">
      <div className="admin-head">
        <div className="admin-head-title">
          <Brand compact />
          <div>
            <h1>📊 {isSuperAdmin ? "Super Administration" : "Tableau de bord Administration"}</h1>
            <p style={{ fontSize: "0.8125rem", color: "var(--grey)", marginTop: "0.125rem" }}>
              {isSuperAdmin ? "Tous les établissements" : access.etablissement}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
          <button className="btn ghost" onClick={exportCsv} disabled={!n}>Exporter CSV</button>
          <button
            className="btn danger"
            disabled={!scopedAttempts.length}
            onClick={async () => {
              const target = isSuperAdmin && etabFilter !== "Tous" ? etabFilter : null;
              const label = target || (isSuperAdmin ? "TOUS les établissements" : access.etablissement);
              if (window.confirm(`Effacer toutes les tentatives enregistrées de ${label} ?`)) {
                await clearAttempts(isSuperAdmin ? target : access.etablissement);
                setRefresh((r) => r + 1);
              }
            }}
          >
            Tout effacer
          </button>
          <Link className="btn" to="/">Accueil</Link>
        </div>
      </div>

      <div style={{ textAlign: "right", marginBottom: "1.125rem", marginTop: "-0.5rem" }}>
        <button type="button" className="about-trigger" onClick={() => setShowAbout(true)}>
          ℹ️ À propos du créateur
        </button>
      </div>

      {isSuperAdmin ? (
        <>
          <h2 className="section-title" style={{ marginTop: 0 }}>Gestion des établissements</h2>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.25rem 1.375rem" }}>
            <p style={{ margin: 0, fontSize: "0.84375rem", color: "var(--grey)" }}>
              Ajoutez un établissement avec son propre code d'accès formateur/directeur. Il apparaîtra aussitôt dans la liste déroulante de la page de connexion et dans la grille des épreuves ci-dessous.
            </p>
            <div className="add-form">
              <div className="field">
                <label htmlFor="new-est-name">Nom de l'établissement</label>
                <input
                  id="new-est-name"
                  placeholder="Ex. : INSTITUT SPECIALISE..."
                  value={newEstName}
                  onChange={(e) => { setNewEstName(e.target.value); setAddEstError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAddEstablishment()}
                />
              </div>
              <div className="field">
                <label htmlFor="new-est-code">Code d'accès</label>
                <input
                  id="new-est-code"
                  placeholder="Ex. : MONETAB2026"
                  value={newEstCode}
                  onChange={(e) => { setNewEstCode(e.target.value); setAddEstError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAddEstablishment()}
                />
              </div>
              <button
                type="button"
                className="btn"
                disabled={!newEstName.trim() || !newEstCode.trim() || addingEst}
                onClick={handleAddEstablishment}
              >
                {addingEst ? "Ajout…" : "➕ Ajouter"}
              </button>
            </div>
            {addEstError && (
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--red)" }}>{addEstError}</p>
            )}
            {establishmentsLoading ? (
              <div className="empty">Chargement…</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Établissement</th>
                    <th>Code d'accès</th>
                  </tr>
                </thead>
                <tbody>
                  {establishments.map((e) => (
                    <tr key={e.etablissement}>
                      <td style={{ fontWeight: 600 }}>{e.etablissement}</td>
                      <td><code>{e.code}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <h2 className="section-title">Épreuves — tous les établissements</h2>
          <div className="card table-card">
            {establishmentsLoading ? (
              <div className="empty">Chargement…</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Établissement</th>
                    {Object.values(EXAMS).map((e) => (
                      <th key={e.id} style={{ textAlign: "center" }}>
                        {e.short}
                        <div style={{ display: "flex", gap: "0.25rem", justifyContent: "center", marginTop: "0.25rem" }}>
                          <button type="button" className="btn ghost btn-sm" style={{ color: "#fff" }} onClick={() => bulkSetExam(e.id, true)}>Tout activer</button>
                          <button type="button" className="btn ghost btn-sm" style={{ color: "#fff" }} onClick={() => bulkSetExam(e.id, false)}>Tout masquer</button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {establishments.map((est) => (
                    <tr key={est.etablissement}>
                      <td style={{ fontWeight: 600 }}>{est.etablissement}</td>
                      {Object.values(EXAMS).map((e) => (
                        <td key={e.id} style={{ textAlign: "center" }}>
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={!!superExamSettings[est.etablissement]?.[e.id]}
                              disabled={savingSuperExam === `${est.etablissement}:${e.id}`}
                              onChange={() => toggleSuperExam(e.id, est.etablissement)}
                              aria-label={`Activer ou désactiver ${e.short} pour ${est.etablissement}`}
                            />
                            <span className="track" />
                          </label>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <>
          <h2 className="section-title" style={{ marginTop: 0 }}>Épreuves disponibles</h2>
          <div className="card exam-settings">
            {Object.values(EXAMS).map((e) => (
              <div className="exam-settings-row" key={e.id}>
                <div>
                  <div className="name">{e.short}</div>
                  <div className="state">
                    {savingExam === e.id
                      ? "Enregistrement…"
                      : examEnabled[e.id]
                        ? "Visible sur la page de connexion"
                        : "Masquée aux candidats"}
                  </div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={!!examEnabled[e.id]}
                    onChange={() => toggleExam(e.id)}
                    aria-label={`Activer ou désactiver ${e.short}`}
                  />
                  <span className="track" />
                </label>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section-title">Importer des stagiaires</h2>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <p style={{ margin: 0, fontSize: "0.84375rem", color: "var(--grey)" }}>
          Téléchargez le gabarit, remplissez une ligne par stagiaire (CIN, Nom, Groupe{isSuperAdmin ? ", Établissement" : ""}), puis importez le fichier pour créer ou mettre à jour les fiches en une fois.
        </p>
        {isSuperAdmin && (
          <div className="field" style={{ maxWidth: "26.25rem" }}>
            <label htmlFor="import-target">Établissement cible</label>
            <select id="import-target" value={importTarget} onChange={(e) => setImportTarget(e.target.value)}>
              <option value="">Utiliser la colonne « Établissement » du fichier</option>
              {etabOptions.filter((e) => e !== "Tous").map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
        )}
        <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn ghost"
            onClick={() => downloadStudentTemplate(isSuperAdmin ? importTarget : access.etablissement)}
          >
            📥 Télécharger le gabarit
          </button>
          <label className="btn" style={{ cursor: "pointer" }}>
            {importing ? "Import en cours…" : "📤 Importer un fichier Excel"}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportFile}
              disabled={importing}
              style={{ display: "none" }}
            />
          </label>
        </div>
        {importResult && (
          <div className={`import-result ${importResult.errors.length ? "has-errors" : ""}`}>
            <p style={{ margin: 0, fontWeight: 600 }}>
              {importResult.imported} stagiaire{importResult.imported > 1 ? "s" : ""} importé{importResult.imported > 1 ? "s" : ""} sur {importResult.total} ligne{importResult.total > 1 ? "s" : ""}.
            </p>
            {importResult.skippedNoCin > 0 && (
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "var(--grey)" }}>
                {importResult.skippedNoCin} ligne{importResult.skippedNoCin > 1 ? "s" : ""} ignorée{importResult.skippedNoCin > 1 ? "s" : ""} (CIN manquant).
              </p>
            )}
            {importResult.errors.length > 0 && (
              <ul style={{ margin: "0.375rem 0 0", paddingLeft: "1.125rem", fontSize: "0.8125rem", color: "var(--red)" }}>
                {importResult.errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
                {importResult.errors.length > 10 && <li>… et {importResult.errors.length - 10} autre(s).</li>}
              </ul>
            )}
          </div>
        )}
      </div>

      <h2 className="section-title">Liste des stagiaires</h2>
      <div className="filters" style={{ marginTop: 0 }}>
        <input
          placeholder="Rechercher un stagiaire par nom ou CIN…"
          value={rosterSearch}
          onChange={(e) => setRosterSearch(e.target.value)}
        />
        {isSuperAdmin && (
          <select value={etabFilter} onChange={(e) => setEtabFilter(e.target.value)}>
            {etabOptions.map((e) => <option key={e}>{e}</option>)}
          </select>
        )}
        <button
          type="button"
          className="btn danger"
          disabled={selectedCins.size === 0 || deletingStudents}
          onClick={handleDeleteSelected}
        >
          {deletingStudents ? "Suppression…" : `🗑️ Supprimer${selectedCins.size ? ` (${selectedCins.size})` : ""}`}
        </button>
      </div>
      <div className="card table-card">
        {rosterLoading ? (
          <div className="empty">Chargement des stagiaires…</div>
        ) : roster.length === 0 ? (
          <div className="empty">
            Aucun stagiaire enregistré pour l'instant.<br />
            <small>Importez un fichier Excel ci-dessus, ou laissez les stagiaires se connecter par CIN pour créer leur fiche automatiquement.</small>
          </div>
        ) : rosterFiltered.length === 0 ? (
          <div className="empty">Aucun stagiaire ne correspond à « {rosterSearch} ».</div>
        ) : (
          <>
          <table>
            <thead>
              <tr>
                <th style={{ width: "2rem" }}>
                  <input
                    type="checkbox"
                    checked={rosterPage.rows.length > 0 && rosterPage.rows.every((s) => selectedCins.has(s.cin))}
                    onChange={() => toggleSelectAllOnPage(rosterPage.rows)}
                    aria-label="Sélectionner tous les stagiaires de cette page"
                  />
                </th>
                <SortableTh label="CIN" sortKey="cin" state={rosterTable} />
                <SortableTh label="Nom" sortKey="nom" state={rosterTable} />
                <SortableTh label="Groupe" sortKey="groupe" state={rosterTable} />
                {isSuperAdmin && <SortableTh label="Établissement" sortKey="etablissement" state={rosterTable} />}
                <SortableTh label="Ajouté / modifié le" sortKey="updated_at" state={rosterTable} />
              </tr>
            </thead>
            <tbody>
              {rosterPage.rows.map((s, i) => (
                <tr
                  key={s.cin}
                  className="clickable-row"
                  style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                  onClick={() => openStudentProfile(s)}
                  title="Voir la fiche du stagiaire"
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedCins.has(s.cin)}
                      onChange={() => toggleSelectStudent(s.cin)}
                      aria-label={`Sélectionner ${s.nom}`}
                      disabled={!s.cin}
                    />
                  </td>
                  <td>{s.cin || "—"}</td>
                  <td style={{ fontWeight: 600 }}>{s.nom}</td>
                  <td>{s.groupe || "—"}</td>
                  {isSuperAdmin && <td>{s.etablissement || "—"}</td>}
                  <td>{s.updated_at ? new Date(s.updated_at).toLocaleString("fr-FR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...rosterPage} onChange={rosterTable.setPage} />
          </>
        )}
      </div>

      <div className="kpis">
        <div className="card stat"><div className="k">Tentatives</div><div className="v">{n}</div></div>
        <div className="card stat"><div className="k">Score moyen</div><div className="v">{avg}%</div></div>
        <div className="card stat"><div className="k">Taux de réussite ({passThresholdLabel})</div><div className="v">{passRate}%</div></div>
        <div className="card stat"><div className="k">Meilleur score</div><div className="v">{bestLabel}</div></div>
        <div className="card stat"><div className="k">Durée moyenne</div><div className="v">{Math.floor(avgDurationSec / 60)} min {avgDurationSec % 60} s</div></div>
      </div>

      <h2 className="section-title">Statistiques visuelles</h2>
      {n === 0 ? (
        <div className="card empty">Pas encore de données à visualiser.</div>
      ) : (
        <div className="charts-grid">
          <div className="card chart-card">
            <h3>Évolution du score</h3>
            <p className="sub">Chronologique, tentatives filtrées</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--grey)", fontSize: 11 }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "var(--grey)", fontSize: 11 }} axisLine={false} tickLine={false} width={34} />
                <Tooltip
                  contentStyle={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12.5 }}
                  labelStyle={{ color: "var(--heading)", fontWeight: 700 }}
                  formatter={(value) => [`${value}%`, "Score"]}
                />
                <Line type="monotone" dataKey="score" name="Score" stroke="var(--teal)" strokeWidth={2} dot={{ r: 3, fill: "var(--teal)" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart-card">
            <h3>Réussite / échec</h3>
            <p className="sub">Seuil de réussite : {PASS_PCT} %</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={passFailData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="var(--white)"
                  strokeWidth={2}
                >
                  <Cell fill="var(--good)" />
                  <Cell fill="var(--red)" />
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12.5 }}
                  formatter={(value, name) => [value, name]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  formatter={(value) => <span style={{ color: "var(--grey)", fontSize: "0.78125rem" }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart-card">
            <h3>Score moyen par groupe</h3>
            <p className="sub">Tentatives filtrées</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={groupChartData} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="groupe" tick={{ fill: "var(--grey)", fontSize: 11 }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "var(--grey)", fontSize: 11 }} axisLine={false} tickLine={false} width={34} />
                <Tooltip
                  contentStyle={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12.5 }}
                  labelStyle={{ color: "var(--heading)", fontWeight: 700 }}
                  formatter={(value) => [`${value}%`, "Score moyen"]}
                />
                <Bar dataKey="score" name="Score moyen" fill="var(--teal)" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  <LabelList dataKey="score" position="top" formatter={(v) => `${v}%`} style={{ fill: "var(--heading)", fontSize: "0.6875rem", fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="filters">
        <input
          placeholder="Rechercher un nom ou un CIN…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isSuperAdmin && (
          <select value={etabFilter} onChange={(e) => setEtabFilter(e.target.value)}>
            {etabOptions.map((e) => <option key={e}>{e}</option>)}
          </select>
        )}
        <select value={groupe} onChange={(e) => setGroupe(e.target.value)}>
          {groupes.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={examFilter} onChange={(e) => setExamFilter(e.target.value)}>
          {exams.map((e) => <option key={e}>{e}</option>)}
        </select>
        <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
          <option>Tous</option>
          <option>Entraînement</option>
          <option>Examen officiel</option>
        </select>
      </div>

      <div className="card table-card">
        {loading ? (
          <div className="empty">Chargement des tentatives…</div>
        ) : n === 0 ? (
          <div className="empty">
            Aucune tentative enregistrée pour l'instant.<br />
            <small>
              {supabase
                ? "Les résultats sont centralisés dans la base Supabase."
                : "Les résultats sont stockés dans le navigateur de ce poste (localStorage)."}
            </small>
          </div>
        ) : (
          <>
          <table>
            <thead>
              <tr>
                <SortableTh label="Date" sortKey="ts" state={attemptsTable} />
                <SortableTh label="Épreuve" sortKey="examLabel" state={attemptsTable} />
                <SortableTh label="CIN" sortKey="cin" state={attemptsTable} />
                <SortableTh label="Nom" sortKey="nom" state={attemptsTable} />
                <SortableTh label="Groupe" sortKey="groupe" state={attemptsTable} />
                <SortableTh label="Établissement" sortKey="etablissement" state={attemptsTable} />
                <SortableTh label="Appareil" sortKey="device" state={attemptsTable} />
                <SortableTh label="Connexion" sortKey="connectionType" state={attemptsTable} />
                <SortableTh label="Score" sortKey="score" state={attemptsTable} />
                <SortableTh label="Verdict" sortKey="passed" state={attemptsTable} />
                <SortableTh label="Durée" sortKey="durationSec" state={attemptsTable} />
              </tr>
            </thead>
            <tbody>
              {attemptsPage.rows.map((a, i) => (
                <tr key={i} style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                  <td>{new Date(a.ts).toLocaleString("fr-FR")}</td>
                  <td>{a.examLabel || "Excel 2016"}</td>
                  <td>{a.cin || "—"}</td>
                  <td style={{ fontWeight: 600 }}>{a.nom}</td>
                  <td>{a.groupe}</td>
                  <td>{a.etablissement || "—"}</td>
                  <td>{a.device || "—"}</td>
                  <td>{a.connectionType || "—"}</td>
                  <td style={{ fontWeight: 700, color: "var(--heading)" }}>
                    {a.kind === "official" ? `${scoreToNote(a.score)} / ${OFFICIAL_MAX_NOTE}` : `${a.score}%`}
                  </td>
                  <td><span className={`badge ${a.passed ? "pass" : "fail"}`}>{a.passed ? "Réussi" : "Échec"}</span></td>
                  <td>{Math.floor(a.durationSec / 60)} min</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...attemptsPage} onChange={attemptsTable.setPage} />
          </>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.625rem", margin: "1.875rem 0 0.875rem" }}>
        <h2 className="section-title" style={{ margin: 0 }}>Statistiques par stagiaire</h2>
        {isOfficialMode && (
          <button type="button" className="btn ghost" disabled={students.length === 0} onClick={exportExcelBilan}>
            📊 Télécharger le bilan Excel
          </button>
        )}
      </div>
      <div className="card table-card">
        {students.length === 0 ? (
          <div className="empty">Aucun stagiaire pour l'instant.</div>
        ) : (
          <>
          <table>
            <thead>
              <tr>
                <SortableTh label="CIN" sortKey="cin" state={studentsTable} />
                <SortableTh label="Nom" sortKey="nom" state={studentsTable} />
                <SortableTh label="Groupe" sortKey="groupe" state={studentsTable} />
                <SortableTh label="Tentatives" sortKey="attempts" state={studentsTable} />
                <SortableTh label="Score moyen" sortKey="avg" state={studentsTable} />
                <SortableTh label="Meilleur score" sortKey="best" state={studentsTable} />
                <SortableTh label="Dernière activité" sortKey="last" state={studentsTable} />
                {isOfficialMode && (
                  <>
                    <th>Tentatives</th>
                    <th>Note</th>
                    <th>Statut</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {studentsPage.rows.map((s, i) => (
                <tr
                  key={s.cin || s.nom}
                  className="clickable-row"
                  style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                  onClick={() => openStudentProfile(s)}
                  title="Voir la fiche du stagiaire"
                >
                  <td>{s.cin || "—"}</td>
                  <td style={{ fontWeight: 600 }}>{s.nom}</td>
                  <td>{s.groupe}</td>
                  <td>{s.attempts}</td>
                  <td style={{ fontWeight: 700, color: "var(--heading)" }}>{s.avg}%</td>
                  <td>{s.best}%</td>
                  <td>{new Date(s.last).toLocaleString("fr-FR")}</td>
                  {isOfficialMode && (
                    <>
                      <td>{s.attempts}/{OFFICIAL_MAX_ATTEMPTS}</td>
                      <td style={{ fontWeight: 700, color: "var(--heading)" }}>{scoreToNote(s.best)} / {OFFICIAL_MAX_NOTE}</td>
                      <td><span className={`badge ${s.best >= OFFICIAL_PASS_PCT ? "pass" : "fail"}`}>{s.best >= OFFICIAL_PASS_PCT ? "Réussi" : "Échec"}</span></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...studentsPage} onChange={studentsTable.setPage} />
          </>
        )}
      </div>

      <h2 className="section-title">Engagement par groupe</h2>
      <div className="card table-card">
        {groupStats.length === 0 ? (
          <div className="empty">Aucun groupe pour l'instant.</div>
        ) : (
          <>
          <table>
            <thead>
              <tr>
                <SortableTh label="Groupe" sortKey="groupe" state={groupsTable} />
                <SortableTh label="Stagiaires" sortKey="studentCount" state={groupsTable} />
                <SortableTh label="Tentatives" sortKey="attempts" state={groupsTable} />
                <SortableTh label="Score moyen" sortKey="avg" state={groupsTable} />
                <SortableTh label="Taux de réussite" sortKey="passRate" state={groupsTable} />
              </tr>
            </thead>
            <tbody>
              {groupsPage.rows.map((g, i) => (
                <tr key={g.groupe} style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                  <td style={{ fontWeight: 600 }}>{g.groupe}</td>
                  <td>{g.studentCount}</td>
                  <td>{g.attempts}</td>
                  <td style={{ fontWeight: 700, color: "var(--heading)" }}>{g.avg}%</td>
                  <td><span className={`badge ${g.passRate >= PASS_PCT ? "pass" : "fail"}`}>{g.passRate}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...groupsPage} onChange={groupsTable.setPage} />
          </>
        )}
      </div>

      <p style={{ marginTop: "1rem", fontSize: "0.8125rem", color: "var(--grey)" }}>
        {supabase
          ? "ℹ️ Les tentatives de tous les postes sont centralisées dans la base Supabase et visibles ici en temps réel."
          : "ℹ️ Supabase n'est pas configuré (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) : chaque poste conserve ses propres résultats en localStorage. Utilisez « Exporter CSV » sur chaque poste pour consolider."}
      </p>
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {profile && (
        <StudentProfileModal
          student={profile.student}
          attempts={profile.attempts}
          onClose={() => setProfile(null)}
        />
      )}
    </div>
  );
}
