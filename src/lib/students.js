// Reconnaissance des stagiaires par CIN (carte d'identité nationale).
// Utilise Supabase (table `students`) quand disponible, sinon repli sur le
// localStorage du navigateur — même logique que src/lib/storage.js.

import { supabase } from "./storage";

const LOCAL_KEY = "mos_students_v1";

function normalizeCin(cin) {
  return (cin || "").trim().toUpperCase();
}

function getLocalStudents() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {};
  } catch {
    return {};
  }
}

function saveLocalStudents(students) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(students));
}

export async function getStudentByCin(cin) {
  const key = normalizeCin(cin);
  if (!key) return null;

  if (supabase) {
    const { data, error } = await supabase
      .from("students")
      .select("cin, nom, groupe, etablissement")
      .eq("cin", key)
      .maybeSingle();
    if (!error) return data;
  }
  return getLocalStudents()[key] || null;
}

export async function upsertStudent({ cin, nom, groupe, etablissement }) {
  const key = normalizeCin(cin);
  if (!key) return;
  const record = { cin: key, nom, groupe, etablissement };

  if (supabase) {
    const { error } = await supabase
      .from("students")
      .upsert({ ...record, updated_at: new Date().toISOString() });
    if (!error) return;
  }
  const students = getLocalStudents();
  students[key] = record;
  saveLocalStudents(students);
}

// Liste complète des stagiaires enregistrés (fiches créées via le gabarit
// Excel ou automatiquement à la connexion par CIN) — indépendante des
// tentatives d'examen, contrairement au tableau "Statistiques par stagiaire".
export async function getAllStudents(etablissement) {
  if (supabase) {
    let query = supabase.from("students").select("cin, nom, groupe, etablissement, updated_at");
    if (etablissement) query = query.eq("etablissement", etablissement);
    const { data, error } = await query;
    if (!error) return data;
  }
  const all = Object.values(getLocalStudents());
  return etablissement ? all.filter((s) => s.etablissement === etablissement) : all;
}

// Import en masse (gabarit Excel) : une seule requête Supabase au lieu d'un
// upsertStudent() par ligne. Les stagiaires sans CIN sont ignorés — le CIN
// est la clé d'identité utilisée pour la reconnaissance automatique.
export async function bulkUpsertStudents(records) {
  const rows = records
    .map(({ cin, nom, groupe, etablissement }) => ({ cin: normalizeCin(cin), nom, groupe, etablissement }))
    .filter((r) => r.cin);
  if (rows.length === 0) return { count: 0 };

  if (supabase) {
    const { error } = await supabase
      .from("students")
      .upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })));
    if (!error) return { count: rows.length };
  }
  const students = getLocalStudents();
  rows.forEach((r) => { students[r.cin] = r; });
  saveLocalStudents(students);
  return { count: rows.length };
}

// Supprime des fiches stagiaire (sélection via case à cocher côté tableau
// de bord). Ne touche pas à l'historique des tentatives.
export async function deleteStudents(cins) {
  const keys = cins.map(normalizeCin).filter(Boolean);
  if (keys.length === 0) return;

  if (supabase) {
    const { error } = await supabase.from("students").delete().in("cin", keys);
    if (!error) return;
  }
  const students = getLocalStudents();
  keys.forEach((k) => { delete students[k]; });
  saveLocalStudents(students);
}
