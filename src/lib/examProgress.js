// Sauvegarde de la progression d'un examen officiel en cours, pour que le
// candidat puisse reprendre la même épreuve (mêmes questions déjà tirées au
// sort, mêmes réponses) s'il la quitte sans soumettre. Le compte à rebours
// est ancré sur une date de fin absolue (`endsAt`) : le temps continue de
// s'écouler pendant l'absence du candidat, il n'est pas mis en pause.

import { supabase } from "./storage";

const LOCAL_KEY = "mos_qcm_exam_progress_v1";

function toRow(p) {
  return {
    cin: p.cin,
    exam_id: p.examId,
    nom: p.nom,
    groupe: p.groupe,
    etablissement: p.etablissement,
    device: p.device,
    connection_type: p.connectionType,
    questions: p.questions,
    answers: p.answers || {},
    current_index: p.currentIndex || 0,
    attempt_number: p.attemptNumber,
    started_at: new Date(p.startedAt).toISOString(),
    ends_at: new Date(p.endsAt).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function fromRow(row) {
  return {
    cin: row.cin,
    examId: row.exam_id,
    nom: row.nom,
    groupe: row.groupe,
    etablissement: row.etablissement,
    device: row.device,
    connectionType: row.connection_type,
    questions: row.questions,
    answers: row.answers || {},
    currentIndex: row.current_index || 0,
    attemptNumber: row.attempt_number,
    startedAt: new Date(row.started_at).getTime(),
    endsAt: new Date(row.ends_at).getTime(),
  };
}

function localKey(cin, examId) {
  return `${(cin || "").trim().toUpperCase()}::${examId}`;
}

function getLocalAll() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {};
  } catch {
    return {};
  }
}

function setLocalAll(all) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  } catch {
    // ignore (navigation privée, stockage désactivé, etc.)
  }
}

export async function saveExamProgress(progress) {
  const cin = (progress.cin || "").trim().toUpperCase();
  const record = { ...progress, cin };
  if (supabase) {
    const { error } = await supabase
      .from("exam_progress")
      .upsert(toRow(record), { onConflict: "cin,exam_id" });
    if (!error) return;
  }
  const all = getLocalAll();
  all[localKey(cin, progress.examId)] = record;
  setLocalAll(all);
}

export async function getExamProgress(cin, examId) {
  const key = (cin || "").trim().toUpperCase();
  if (!key) return null;

  if (supabase) {
    const { data, error } = await supabase
      .from("exam_progress")
      .select("*")
      .eq("cin", key)
      .eq("exam_id", examId)
      .maybeSingle();
    if (!error) return data ? fromRow(data) : null;
  }
  return getLocalAll()[localKey(key, examId)] || null;
}

export async function clearExamProgress(cin, examId) {
  const key = (cin || "").trim().toUpperCase();
  if (supabase) {
    await supabase.from("exam_progress").delete().eq("cin", key).eq("exam_id", examId);
  }
  const all = getLocalAll();
  delete all[localKey(key, examId)];
  setLocalAll(all);
}
