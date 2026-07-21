// Couche de stockage des tentatives.
// Utilise Supabase (table `attempts`) quand VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY sont définis ; sinon, repli automatique sur le
// localStorage du navigateur (comportement d'origine, utile en local sans
// configuration ou si Supabase est momentanément indisponible).

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const LOCAL_KEY = "mos_qcm_attempts_v1";

function toRow(attempt) {
  return {
    ts: new Date(attempt.ts).toISOString(),
    cin: attempt.cin,
    nom: attempt.nom,
    groupe: attempt.groupe,
    etablissement: attempt.etablissement,
    exam_id: attempt.examId,
    exam_label: attempt.examLabel,
    device: attempt.device,
    connection_type: attempt.connectionType,
    score: attempt.score,
    correct: attempt.correct,
    total: attempt.total,
    passed: attempt.passed,
    duration_sec: attempt.durationSec,
    per_domain: attempt.perDomain,
    answers: attempt.answers,
  };
}

function fromRow(row) {
  return {
    ts: new Date(row.ts).getTime(),
    cin: row.cin,
    nom: row.nom,
    groupe: row.groupe,
    etablissement: row.etablissement,
    examId: row.exam_id,
    examLabel: row.exam_label,
    device: row.device,
    connectionType: row.connection_type,
    score: row.score,
    correct: row.correct,
    total: row.total,
    passed: row.passed,
    durationSec: row.duration_sec,
    perDomain: row.per_domain,
    answers: row.answers,
  };
}

function getLocalAttempts() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLocalAttempt(attempt) {
  const all = getLocalAttempts();
  all.unshift(attempt);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(all.slice(0, 500)));
}

export async function saveAttempt(attempt) {
  if (supabase) {
    const { error } = await supabase.from("attempts").insert(toRow(attempt));
    if (!error) return;
  }
  saveLocalAttempt(attempt);
}

export async function getAttempts() {
  if (supabase) {
    const { data, error } = await supabase
      .from("attempts")
      .select("*")
      .order("ts", { ascending: false })
      .limit(1000);
    if (!error) return data.map(fromRow);
  }
  return getLocalAttempts();
}

// Historique des tentatives d'un stagiaire donné (espace stagiaire), trié du
// plus récent au plus ancien.
export async function getAttemptsByCin(cin) {
  const key = (cin || "").trim().toUpperCase();
  if (!key) return [];

  if (supabase) {
    const { data, error } = await supabase
      .from("attempts")
      .select("*")
      .eq("cin", key)
      .order("ts", { ascending: false })
      .limit(200);
    if (!error) return data.map(fromRow);
  }
  return getLocalAttempts().filter((a) => (a.cin || "").trim().toUpperCase() === key);
}

export async function clearAttempts(etablissement) {
  if (supabase) {
    const query = supabase.from("attempts").delete();
    await (etablissement ? query.eq("etablissement", etablissement) : query.not("id", "is", null));
  }
  if (etablissement) {
    const remaining = getLocalAttempts().filter((a) => a.etablissement !== etablissement);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(remaining));
  } else {
    localStorage.removeItem(LOCAL_KEY);
  }
}
