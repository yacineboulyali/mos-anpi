// Script ponctuel : crée un profil de test (Yacine Boulyali, CIN AD239604)
// avec un historique de tentatives réparties dans le temps, pour visualiser
// les statistiques/graphes du tableau de bord formateur.
//
// Usage : node --env-file=.env scripts/seed-test-profile.mjs

import { createClient } from "@supabase/supabase-js";
import excelData from "../src/questions-excel.json" with { type: "json" };
import wordData from "../src/questions-word.json" with { type: "json" };
import powerpointData from "../src/questions-powerpoint.json" with { type: "json" };
import excelExpertData from "../src/questions-excel-expert.json" with { type: "json" };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants (fichier .env).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CIN = "AD239604";
const NOM = "Yacine BOULYALI";
const GROUPE = "Groupe A";
const ETABLISSEMENT = "INSTITUT SPECIALISE DE TECHNOLOGIE APPLIQUEE AIN ATIQ";

const EXAMS = {
  excel2016: { data: excelData, label: "Excel 2016" },
  word2016: { data: wordData, label: "Word 2016" },
  powerpoint2016: { data: powerpointData, label: "PowerPoint 2016" },
  excelexpert2016: { data: excelExpertData, label: "Excel Expert 2016" },
};

function buildPerDomain(examId, scorePct) {
  const domains = EXAMS[examId].data;
  return domains.map((d) => {
    const total = d.questions.length;
    // fait varier légèrement le score par domaine autour du score global
    const jitter = (Math.random() - 0.5) * 20;
    const domainPct = Math.min(100, Math.max(0, scorePct + jitter));
    const correct = Math.max(0, Math.min(total, Math.round((domainPct / 100) * total)));
    return { domain: d.domain, correct, total };
  });
}

// Scénario : progression sur ~6 semaines, quelques échecs au début puis
// amélioration constante, mélange des 4 épreuves.
const PLAN = [
  { daysAgo: 42, examId: "excel2016", score: 52 },
  { daysAgo: 37, examId: "word2016", score: 58 },
  { daysAgo: 31, examId: "excel2016", score: 61 },
  { daysAgo: 26, examId: "powerpoint2016", score: 65 },
  { daysAgo: 21, examId: "word2016", score: 69 },
  { daysAgo: 16, examId: "excel2016", score: 74 },
  { daysAgo: 12, examId: "excelexpert2016", score: 63 },
  { daysAgo: 8, examId: "powerpoint2016", score: 80 },
  { daysAgo: 4, examId: "excelexpert2016", score: 77 },
  { daysAgo: 1, examId: "excel2016", score: 88 },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const DEVICES = ["Windows PC", "Android — SM-A536B", "iPhone"];
const CONNECTIONS = ["Wi-Fi", "4G", "3G"];

async function run() {
  const { error: studentError } = await supabase.from("students").upsert({
    cin: CIN,
    nom: NOM,
    groupe: GROUPE,
    etablissement: ETABLISSEMENT,
    updated_at: new Date().toISOString(),
  });
  if (studentError) {
    console.error("Erreur création stagiaire :", studentError.message);
    process.exit(1);
  }
  console.log(`✔ Stagiaire ${NOM} (${CIN}) créé/mis à jour.`);

  let inserted = 0;
  for (const step of PLAN) {
    const { examId, score, daysAgo } = step;
    const exam = EXAMS[examId];
    const total = exam.data.reduce((s, d) => s + d.questions.length, 0);
    const correct = Math.round((score / 100) * total);
    const ts = new Date(Date.now() - daysAgo * DAY_MS - Math.floor(Math.random() * 6) * 3600 * 1000);
    const perDomain = buildPerDomain(examId, score);
    const durationSec = 1200 + Math.floor(Math.random() * 1500); // 20–45 min

    const row = {
      ts: ts.toISOString(),
      cin: CIN,
      nom: NOM,
      groupe: GROUPE,
      etablissement: ETABLISSEMENT,
      exam_id: examId,
      exam_label: exam.label,
      device: DEVICES[Math.floor(Math.random() * DEVICES.length)],
      connection_type: CONNECTIONS[Math.floor(Math.random() * CONNECTIONS.length)],
      score,
      correct,
      total,
      passed: score >= 70,
      duration_sec: durationSec,
      per_domain: perDomain,
      answers: {},
    };

    const { error } = await supabase.from("attempts").insert(row);
    if (error) {
      console.error(`Erreur tentative (${exam.label}, il y a ${daysAgo}j) :`, error.message);
      continue;
    }
    inserted += 1;
    console.log(`✔ Tentative ${exam.label} — score ${score}% — il y a ${daysAgo} jour(s)`);
  }

  console.log(`\n${inserted}/${PLAN.length} tentatives insérées pour ${NOM} (${CIN}).`);
}

run();
