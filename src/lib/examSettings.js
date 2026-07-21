// Active/désactive les épreuves proposées sur la page de connexion, par
// établissement (chaque établissement gère ses propres épreuves). Utilise
// Supabase (table `exam_settings`) quand disponible, sinon repli sur le
// localStorage du navigateur — même logique que src/lib/storage.js.

import { supabase } from "./storage";
import { EXAMS } from "./exams";

const LOCAL_KEY_PREFIX = "mos_exam_settings_v2_";

function localKey(etablissement) {
  return LOCAL_KEY_PREFIX + (etablissement || "GLOBAL");
}

function getLocalSettings(etablissement) {
  try {
    return JSON.parse(localStorage.getItem(localKey(etablissement))) || {};
  } catch {
    return {};
  }
}

function saveLocalSettings(etablissement, settings) {
  localStorage.setItem(localKey(etablissement), JSON.stringify(settings));
}

function withDefaults(map) {
  const out = {};
  Object.keys(EXAMS).forEach((id) => {
    out[id] = map[id] !== undefined ? map[id] : true;
  });
  return out;
}

export async function getExamSettings(etablissement) {
  if (supabase) {
    const { data, error } = await supabase
      .from("exam_settings")
      .select("exam_id, enabled")
      .eq("etablissement", etablissement);
    if (!error) {
      const map = {};
      data.forEach((row) => { map[row.exam_id] = row.enabled; });
      return withDefaults(map);
    }
  }
  return withDefaults(getLocalSettings(etablissement));
}

export async function setExamEnabled(examId, etablissement, enabled) {
  if (supabase) {
    const { error } = await supabase
      .from("exam_settings")
      .upsert({ exam_id: examId, etablissement, enabled, updated_at: new Date().toISOString() });
    if (!error) return;
  }
  const settings = getLocalSettings(etablissement);
  settings[examId] = enabled;
  saveLocalSettings(etablissement, settings);
}
