// Règles du mode "Examen officiel" (distinct de l'entraînement) : questions
// tirées au hasard dans tout le pool (indépendamment du domaine), durée et
// nombre de tentatives réduits, aucune correction affichée pendant l'épreuve.

import { shuffleArray, shuffleQuestionOptions } from "./exams";

export const OFFICIAL_EXAM_IDS = ["excel2016", "excelexpert2016"];
export const OFFICIAL_QUESTION_COUNT = 20;
export const OFFICIAL_DURATION_MIN = 50;
export const OFFICIAL_MAX_ATTEMPTS = 5;

// La note officielle est exprimée sur 40 (2 points par question, pour 20
// questions), seuil de réussite à 20/40 — distinct du seuil d'entraînement
// (PASS_PCT, 70 %) défini dans exams.js.
export const OFFICIAL_MAX_NOTE = 40;
export const OFFICIAL_PASS_NOTE = 20;
export const OFFICIAL_PASS_PCT = (OFFICIAL_PASS_NOTE / OFFICIAL_MAX_NOTE) * 100;

export function pickOfficialQuestions(flat, count = OFFICIAL_QUESTION_COUNT) {
  return shuffleArray(flat)
    .slice(0, count)
    .map(shuffleQuestionOptions);
}

// Convertit un score en pourcentage (0-100, tel que stocké sur chaque
// tentative) en note sur OFFICIAL_MAX_NOTE, pour l'affichage et le bilan.
export function scoreToNote(scorePct, maxNote = OFFICIAL_MAX_NOTE) {
  return Math.round((scorePct / 100) * maxNote * 10) / 10;
}
