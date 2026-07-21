// Établissement pour lequel l'authentification candidat se fait par CIN
// (reconnaissance automatique). Les autres établissements demandent
// simplement un nom, sans CIN.
export const CIN_ESTABLISHMENT = "INSTITUT SPECIALISE DE TECHNOLOGIE APPLIQUEE AIN ATIQ";

export const OTHER_OPTION = "Autres";

// Établissements officiellement gérés (avec code d'accès formateur/directeur
// dédié — voir src/pages/Admin.jsx).
export const ESTABLISHMENTS = [
  "INSTITUT SPECIALISE DE TECHNOLOGIE APPLIQUEE AIN AOUDA",
  CIN_ESTABLISHMENT,
  "INSTITUT SPECIALISE DE TECHNOLOGIE APPLIQUEE MULTISECTORIEL TEMARA",
  "INSTITUT SPECIALISE DE TECHNOLOGIE APPLIQUEE TEMARA",
];

// Liste complète proposée sur la page de connexion candidat.
export const ESTABLISHMENTS_WITH_OTHER = [...ESTABLISHMENTS, OTHER_OPTION];
