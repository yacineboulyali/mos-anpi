// Accès Administration par établissement + Super Administration.
//
// Chaque établissement a un code d'accès (formateur/directeur) qui ne donne
// accès qu'à ses propres stagiaires et statistiques. Le code Super Admin
// (ADMIN2026 par défaut) donne accès à TOUS les établissements, avec en plus
// la possibilité d'en ajouter de nouveaux (avec leur propre code).
//
// Utilise Supabase (table `establishments`) quand disponible, sinon repli sur
// le localStorage du navigateur — même logique que les autres fichiers de
// src/lib/.

import { supabase } from "./storage";
import { ESTABLISHMENTS } from "./establishments";

export const SUPERADMIN_CODE = import.meta.env.VITE_CODE_SUPERADMIN || "ADMIN2026";

// Établissements historiques, déjà déployés avec ces codes avant l'ajout de
// la gestion dynamique. Toujours disponibles même sans Supabase configuré.
const DEFAULT_ESTABLISHMENTS = [
  {
    etablissement: "INSTITUT SPECIALISE DE TECHNOLOGIE APPLIQUEE AIN AOUDA",
    code: import.meta.env.VITE_CODE_AIN_AOUDA || "AINAOUDA2026",
  },
  {
    etablissement: "INSTITUT SPECIALISE DE TECHNOLOGIE APPLIQUEE AIN ATIQ",
    code: import.meta.env.VITE_CODE_AIN_ATIQ || "AINATIQ2026",
  },
  {
    etablissement: "INSTITUT SPECIALISE DE TECHNOLOGIE APPLIQUEE MULTISECTORIEL TEMARA",
    code: import.meta.env.VITE_CODE_MULTI_TEMARA || "MULTITEMARA2026",
  },
  {
    etablissement: "INSTITUT SPECIALISE DE TECHNOLOGIE APPLIQUEE TEMARA",
    code: import.meta.env.VITE_CODE_TEMARA || "TEMARA2026",
  },
];

const LOCAL_KEY = "mos_establishments_v1";

function getLocalEstablishments() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLocalEstablishments(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

function mergeUnique(seed, added) {
  const map = new Map(seed.map((e) => [e.etablissement, e]));
  added.forEach((e) => map.set(e.etablissement, e));
  return [...map.values()];
}

// Liste complète (établissements historiques + ajoutés dynamiquement), triée
// par nom. Utilisée pour l'écran de connexion Admin, la liste déroulante
// "Établissement" du stagiaire, et la grille de gestion des épreuves.
export async function getEstablishmentAccessList() {
  let added = [];
  if (supabase) {
    const { data, error } = await supabase
      .from("establishments")
      .select("etablissement, code");
    if (!error) added = data;
  }
  if (added.length === 0 && !supabase) added = getLocalEstablishments();

  return mergeUnique(DEFAULT_ESTABLISHMENTS, added).sort((a, b) =>
    a.etablissement.localeCompare(b.etablissement, "fr")
  );
}

// Noms d'établissements uniquement (statiques historiques + ajoutés), pour
// la liste déroulante côté page de connexion candidat.
export async function getEstablishmentNames() {
  const list = await getEstablishmentAccessList();
  return mergeUnique(
    ESTABLISHMENTS.map((etablissement) => ({ etablissement })),
    list.map(({ etablissement }) => ({ etablissement }))
  )
    .map((e) => e.etablissement)
    .sort((a, b) => a.localeCompare(b, "fr"));
}

// Ajoute un nouvel établissement + son code d'accès. Lève une erreur si le
// nom ou le code est déjà utilisé.
export async function addEstablishment(etablissement, code) {
  const name = etablissement.trim();
  const trimmedCode = code.trim();
  if (!name) throw new Error("Le nom de l'établissement est obligatoire.");
  if (!trimmedCode) throw new Error("Le code d'accès est obligatoire.");

  const existing = await getEstablishmentAccessList();
  if (existing.some((e) => e.etablissement.toLowerCase() === name.toLowerCase())) {
    throw new Error("Cet établissement existe déjà.");
  }
  if (trimmedCode === SUPERADMIN_CODE || existing.some((e) => e.code === trimmedCode)) {
    throw new Error("Ce code d'accès est déjà utilisé.");
  }

  if (supabase) {
    const { error } = await supabase
      .from("establishments")
      .insert({ etablissement: name, code: trimmedCode });
    if (!error) return { etablissement: name, code: trimmedCode };
  }
  const local = getLocalEstablishments();
  local.push({ etablissement: name, code: trimmedCode });
  saveLocalEstablishments(local);
  return { etablissement: name, code: trimmedCode };
}

// Résout un code saisi sur l'écran de connexion Admin : code Super Admin
// (accès à tout), code d'un établissement précis, ou rien.
export async function resolveAdminAccess(rawCode) {
  const trimmed = rawCode.trim();
  if (!trimmed) return null;
  if (trimmed === SUPERADMIN_CODE) return { etablissement: null, isSuperAdmin: true };

  const list = await getEstablishmentAccessList();
  const match = list.find((e) => e.code === trimmed);
  return match ? { etablissement: match.etablissement, isSuperAdmin: false } : null;
}
