// Import / export en masse des stagiaires via un fichier Excel (.xlsx).
// Utilise la version corrigée de SheetJS (xlsx@0.20.3, installée depuis le
// CDN officiel — voir package.json) plutôt que celle publiée sur npm.
import * as XLSX from "xlsx";

const TEMPLATE_HEADERS = ["CIN", "Nom", "Groupe", "Établissement"];

const HEADER_ALIASES = {
  cin: ["cin", "cni", "carte d'identité nationale", "carte d identite nationale"],
  nom: ["nom", "nom complet", "nom et prenom", "nom et prénom", "stagiaire"],
  groupe: ["groupe", "classe", "group"],
  etablissement: ["etablissement", "établissement", "institut", "ista"],
};

function stripAccents(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizeHeader(h) {
  return stripAccents(String(h || "").trim().toLowerCase());
}

function fieldForHeader(header) {
  const norm = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((a) => stripAccents(a) === norm)) return field;
  }
  return null;
}

// Génère et télécharge le gabarit Excel avec les colonnes attendues et une
// ligne d'exemple pré-remplie.
export function downloadStudentTemplate(defaultEtablissement = "") {
  const sheetData = [
    TEMPLATE_HEADERS,
    ["AB123456", "Karim Alami", "Groupe A", defaultEtablissement],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet["!cols"] = [{ wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 46 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Stagiaires");
  XLSX.writeFile(workbook, "gabarit_stagiaires_mos.xlsx");
}

// Lit un fichier .xlsx/.xls et retourne les lignes brutes sous forme
// d'objets { cin, nom, groupe, etablissement } (colonnes reconnues de façon
// tolérante à la casse/aux accents, l'ordre des colonnes n'importe pas).
export function parseStudentsFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });
        if (rows.length === 0) return resolve([]);

        const headerRow = rows[0];
        const fieldByCol = headerRow.map(fieldForHeader);

        const records = rows.slice(1)
          .filter((row) => row.some((cell) => String(cell || "").trim() !== ""))
          .map((row) => {
            const record = { cin: "", nom: "", groupe: "", etablissement: "" };
            fieldByCol.forEach((field, i) => {
              if (field) record[field] = String(row[i] ?? "").trim();
            });
            return record;
          });
        resolve(records);
      } catch {
        reject(new Error("Le fichier n'a pas pu être analysé. Vérifiez qu'il s'agit bien d'un fichier Excel (.xlsx)."));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// Valide les lignes brutes et force l'établissement quand l'accès est limité
// à un seul établissement (sécurité : on ignore la colonne du fichier).
export function normalizeStudentsRows(rows, { forceEtablissement } = {}) {
  const valid = [];
  const errors = [];

  rows.forEach((row, i) => {
    const line = i + 2; // +1 pour l'index base-0, +1 pour la ligne d'en-tête
    const nom = row.nom.trim();
    const etablissement = forceEtablissement || row.etablissement.trim();

    if (!nom) {
      errors.push(`Ligne ${line} : le nom est obligatoire.`);
      return;
    }
    if (!etablissement) {
      errors.push(`Ligne ${line} (${nom}) : l'établissement est obligatoire.`);
      return;
    }
    valid.push({
      cin: row.cin.trim().toUpperCase() || null,
      nom,
      groupe: row.groupe.trim(),
      etablissement,
    });
  });

  return { valid, errors };
}
