// Script ponctuel : importe la liste des stagiaires de l'ISTA AIN ATIQ
// (filière GE, groupes GE101/GE102/GE103) dans la table `students`, pour que
// la reconnaissance automatique par CIN fonctionne dès leur première
// connexion.
//
// Usage : node --env-file=.env scripts/seed-students-ain-atiq.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants (fichier .env).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ETABLISSEMENT = "INSTITUT SPECIALISE DE TECHNOLOGIE APPLIQUEE AIN ATIQ";

const STAGIAIRES = [
  { Nom: "EL-FEN", Prenom: "ABDELLATIF", CodeDiplome: "GE101", CIN: "AD375286" },
  { Nom: "ELKHIRI", Prenom: "ASMAE", CodeDiplome: "GE101", CIN: "AD375669" },
  { Nom: "EL YOUNSI", Prenom: "SIHAM", CodeDiplome: "GE101", CIN: "AM13388" },
  { Nom: "EL AMRANI", Prenom: "KAOUTHAR", CodeDiplome: "GE101", CIN: "FH63350" },
  { Nom: "TALBI", Prenom: "MOHAMED", CodeDiplome: "GE101", CIN: "AD342219" },
  { Nom: "M'KACHRA", Prenom: "WISSAM", CodeDiplome: "GE101", CIN: "AD351828" },
  { Nom: "BOUNOIR", Prenom: "HATIM", CodeDiplome: "GE101", CIN: "AD373272" },
  { Nom: "ZAKI", Prenom: "TAOUFIK", CodeDiplome: "GE101", CIN: "AM1636" },
  { Nom: "BOUKDIR", Prenom: "SALMA", CodeDiplome: "GE101", CIN: "AD367696" },
  { Nom: "EL ABBASSI", Prenom: "ILYASS", CodeDiplome: "GE101", CIN: "AD365013" },
  { Nom: "MOUCHANE", Prenom: "YASMINE", CodeDiplome: "GE101", CIN: "AD373314" },
  { Nom: "SARBOUT", Prenom: "HASSNA", CodeDiplome: "GE101", CIN: "AD365848" },
  { Nom: "EL KHAROUID", Prenom: "YOUSSEF", CodeDiplome: "GE101", CIN: "AD369854" },
  { Nom: "EL HAMDI", Prenom: "MARIEM", CodeDiplome: "GE101", CIN: "AD370273" },
  { Nom: "MAKHLOUF", Prenom: "MERYEM", CodeDiplome: "GE101", CIN: "AJ2982" },
  { Nom: "BAHRA", Prenom: "WALID", CodeDiplome: "GE101", CIN: "AD374721" },
  { Nom: "EL MARSAOUI", Prenom: "HIBA", CodeDiplome: "GE101", CIN: "AD379764" },
  { Nom: "SALIHI", Prenom: "SAFAE", CodeDiplome: "GE102", CIN: "AD365348" },
  { Nom: "EL HOR", Prenom: "AYA", CodeDiplome: "GE102", CIN: "AD372951" },
  { Nom: "AL KOUCH", Prenom: "MERYEM", CodeDiplome: "GE102", CIN: "AM16668" },
  { Nom: "HATIM", Prenom: "NAJWA", CodeDiplome: "GE102", CIN: "AD354770" },
  { Nom: "ERRACHDI", Prenom: "HATIM", CodeDiplome: "GE102", CIN: "AM7298" },
  { Nom: "ZOUHAIR", Prenom: "YASSMINE", CodeDiplome: "GE102", CIN: "AD374724" },
  { Nom: "EL MAHJOUR", Prenom: "SALMA", CodeDiplome: "GE102", CIN: "AD365087" },
  { Nom: "MAGHNAOUI", Prenom: "MARWA", CodeDiplome: "GE102", CIN: "AD378373" },
  { Nom: "OURADA", Prenom: "YOUSSEF", CodeDiplome: "GE102", CIN: "AD369410" },
  { Nom: "FATHI", Prenom: "MARYEM", CodeDiplome: "GE102", CIN: "AD365335" },
  { Nom: "OUBOUZ", Prenom: "FATIMA", CodeDiplome: "GE102", CIN: "AD360280" },
  { Nom: "EL HILALI", Prenom: "MOHAMED", CodeDiplome: "GE102", CIN: "AM9510" },
  { Nom: "CHARHABILI", Prenom: "AHMED", CodeDiplome: "GE102", CIN: "AD358973" },
  { Nom: "BELLILA", Prenom: "WALID", CodeDiplome: "GE102", CIN: "AD339584" },
  { Nom: "DAZZAZ", Prenom: "LAILA", CodeDiplome: "GE102", CIN: "AD373174" },
  { Nom: "KARIM", Prenom: "AYA", CodeDiplome: "GE102", CIN: "AD380106" },
  { Nom: "SEFIAN", Prenom: "AYMAN", CodeDiplome: "GE102", CIN: "AM18327" },
  { Nom: "ZEHARI", Prenom: "AMINA", CodeDiplome: "GE102", CIN: "AM9207" },
  { Nom: "EL MAHBOUBI", Prenom: "YOUSSEF", CodeDiplome: "GE102", CIN: "AD367746" },
  { Nom: "TRYI", Prenom: "MAJDA", CodeDiplome: "GE102", CIN: "XA157524" },
  { Nom: "ASRAOUI", Prenom: "YOUSSEF", CodeDiplome: "GE102", CIN: "AM8760" },
  { Nom: "EL MOUMEN", Prenom: "HAMZA", CodeDiplome: "GE102", CIN: "AD380915" },
  { Nom: "AZMI", Prenom: "YOUNESS", CodeDiplome: "GE103", CIN: "AD360069" },
  { Nom: "AZAMI ADLI", Prenom: "OMAR", CodeDiplome: "GE103", CIN: "AA73445" },
  { Nom: "BELHMAR", Prenom: "RIHAB", CodeDiplome: "GE103", CIN: "AD360128" },
  { Nom: "ELARIFI", Prenom: "ANASS", CodeDiplome: "GE103", CIN: "K654967" },
  { Nom: "CHATOUI", Prenom: "REDA", CodeDiplome: "GE103", CIN: "AD369796" },
  { Nom: "ELALMI", Prenom: "ABDELMOULA", CodeDiplome: "GE103", CIN: "AD367794" },
  { Nom: "EL GAMA", Prenom: "SALAH EDDINE", CodeDiplome: "GE103", CIN: "AD373706" },
  { Nom: "ABOULHOUDA", Prenom: "NADIA", CodeDiplome: "GE103", CIN: "M698254" },
  { Nom: "ESSAIDI", Prenom: "MARWA", CodeDiplome: "GE103", CIN: "AD376318" },
  { Nom: "EL AYACHI", Prenom: "ILHAM", CodeDiplome: "GE103", CIN: "AD371847" },
  { Nom: "TAJEMOUATI", Prenom: "ISMAIL", CodeDiplome: "GE103", CIN: "AM16988" },
  { Nom: "WAJNIH", Prenom: "ADAM", CodeDiplome: "GE103", CIN: "AD377124" },
  { Nom: "MEFTAH", Prenom: "SALMA", CodeDiplome: "GE103", CIN: "AD342578" },
  { Nom: "M'SAADI", Prenom: "MOUNA", CodeDiplome: "GE103", CIN: "AD335612" },
  { Nom: "EZZOUINE", Prenom: "FATIMA.EZZAHRA", CodeDiplome: "GE103", CIN: "AD371949" },
  { Nom: "HANOUDI", Prenom: "HAMZA", CodeDiplome: "GE103", CIN: "AD373496" },
  { Nom: "BRIBRI", Prenom: "NISRINE", CodeDiplome: "GE103", CIN: "AD381618" },
  { Nom: "EL HOUMA", Prenom: "YOUSRA", CodeDiplome: "GE103", CIN: "AD355779" },
  { Nom: "DZOUZI", Prenom: "AYOUB", CodeDiplome: "GE103", CIN: "AD371100" },
  { Nom: "ACHEMSI", Prenom: "IMANE", CodeDiplome: "GE103", CIN: "AD362383" },
  { Nom: "AZAFAD", Prenom: "MARIAM", CodeDiplome: "GE103", CIN: "AM8766" },
];

function titleCase(str) {
  return str
    .toLowerCase()
    .split(/([ '-])/)
    .map((part) => (/^[ '-]$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

async function run() {
  let ok = 0;
  let failed = 0;
  for (const s of STAGIAIRES) {
    const nom = `${titleCase(s.Prenom)} ${s.Nom.toUpperCase()}`;
    const { error } = await supabase.from("students").upsert({
      cin: s.CIN.trim().toUpperCase(),
      nom,
      groupe: s.CodeDiplome,
      etablissement: ETABLISSEMENT,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      failed += 1;
      console.error(`✘ ${nom} (${s.CIN}) : ${error.message}`);
      continue;
    }
    ok += 1;
    console.log(`✔ ${nom} (${s.CIN}) — ${s.CodeDiplome}`);
  }
  console.log(`\n${ok}/${STAGIAIRES.length} stagiaires importés (${failed} échec(s)).`);
}

run();
