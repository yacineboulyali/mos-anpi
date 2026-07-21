// Détecte qui est actuellement connecté dans cet onglet (candidat pendant/
// après une épreuve, ou formateur/directeur dans l'espace admin), pour
// piloter le menu de navigation (src/components/NavDrawer.jsx).

function readJSON(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key));
  } catch {
    return null;
  }
}

export function getSession() {
  const staffAccess = readJSON("mos_admin_access");
  if (staffAccess) return { type: "staff", ...staffAccess };

  const candidate = readJSON("mos_candidate");
  if (candidate) return { type: "candidate", ...candidate };

  const student = readJSON("mos_student_access");
  if (student) return { type: "student", ...student };

  return { type: "guest" };
}

export function hasResults() {
  return !!sessionStorage.getItem("mos_last_result");
}

export function logoutCandidate() {
  sessionStorage.removeItem("mos_candidate");
  sessionStorage.removeItem("mos_last_result");
}

export function logoutStaff() {
  sessionStorage.removeItem("mos_admin_access");
}

export function logoutStudent() {
  sessionStorage.removeItem("mos_student_access");
}
