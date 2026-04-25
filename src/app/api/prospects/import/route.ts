// POST /api/prospects/import — multipart/form-data avec field "file"
// Parse CSV / XLSX / DOCX / PDF → crée des Prospect avec source=IMPORT_CSV
// Import direct (pas de preview). Retourne stats {imported, skipped, errors}.

import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

// Champs reconnus dans les en-têtes (fuzzy match case-insensitive, accents ignorés)
const HEADER_MAP: Record<string, string> = {
  prenom: "prenom", "prénom": "prenom", firstname: "prenom", "first name": "prenom",
  nom: "nom", lastname: "nom", "last name": "nom",
  entreprise: "entreprise", company: "entreprise", société: "entreprise", societe: "entreprise",
  "nom entreprise": "entreprise", "nom entreprise / indépendant": "entreprise",
  "raison sociale": "entreprise", organisation: "entreprise",
  ville: "ville", city: "ville", localite: "ville", localité: "ville",
  canton: "canton",
  npa: "npa", "code postal": "npa", cp: "npa", zip: "npa",
  adresse: "adresse", address: "adresse", rue: "adresse",
  email: "email", mail: "email", "e-mail": "email", courriel: "email",
  phone: "phone", "téléphone": "phone", telephone: "phone", tel: "phone", mobile: "phone",
  instagram: "instagram", insta: "instagram",
  linkedin: "linkedin",
  "site web": "siteWeb", siteweb: "siteWeb", website: "siteWeb", site: "siteWeb", url: "siteWeb",
  secteur: "secteur", industry: "secteur",
  "secteur d'activite": "secteur", "secteur d'activité": "secteur",
  "type d'activite": "secteur", "type d'activité": "secteur", activite: "secteur", activité: "secteur",
  canal: "canal", channel: "canal", source: "canal",
  statut: "statut", status: "statut", "étape": "statut",
  urgence: "urgence", priority: "urgence", priorité: "urgence",
  score: "score", "score global": "score", "score klaivia": "score", "score global klaivia": "score",
  notes: "notes", remarques: "notes", commentaires: "notes", justification: "notes",
};

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)/g, " ") // strip parenth\u00e8ses (ex: "Score (/10)" \u2192 "score")
    .replace(/[^a-z0-9]+/g, " ") // remplace tout non-alphanum par espace
    .trim()
    .replace(/\s+/g, " ");
}

// Pr\u00e9-normalise toutes les cl\u00e9s du HEADER_MAP au boot pour comparaison directe
const NORMALIZED_HEADER_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(HEADER_MAP).map(([k, v]) => [normalizeKey(k), v]),
);

function mapHeaderRow(headers: string[]): (string | null)[] {
  return headers.map((h) => NORMALIZED_HEADER_MAP[normalizeKey(h)] ?? null);
}

type PartialProspect = {
  prenom?: string;
  nom?: string;
  entreprise?: string;
  ville?: string;
  canton?: string;
  npa?: string;
  adresse?: string;
  email?: string;
  phone?: string;
  instagram?: string;
  linkedin?: string;
  siteWeb?: string;
  secteur?: string;
  canal?: string;
  statut?: string;
  urgence?: string;
  score?: number;
  notes?: string;
};

function buildFromRow(row: Record<string, unknown>, headerMap: (string | null)[], headers: string[]): PartialProspect {
  const out: PartialProspect = {};
  headers.forEach((h, i) => {
    const key = headerMap[i];
    if (!key) return;
    const val = row[h];
    if (val == null || val === "") return;
    if (key === "score") {
      const n = Number(val);
      if (Number.isFinite(n)) out.score = Math.max(1, Math.min(5, Math.round(n)));
    } else {
      (out as Record<string, string>)[key] = String(val).trim();
    }
  });
  return out;
}

// Parse CSV / XLSX via SheetJS — détecte la row d'en-tête dynamiquement
// (tolère lignes vides ou titres avant la vraie ligne d'en-têtes).
async function parseSpreadsheet(buf: Buffer): Promise<PartialProspect[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "buffer" });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];

  // Mode array-of-arrays pour scanner et trouver la vraie row d'en-tête
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });
  if (aoa.length === 0) return [];

  // Cherche la première row qui contient au moins UNE colonne reconnue
  let headerRowIdx = -1;
  let headers: string[] = [];
  for (let i = 0; i < Math.min(aoa.length, 10); i++) {
    const row = aoa[i].map((c) => String(c ?? "").trim());
    const recognized = row.filter((h) => h && NORMALIZED_HEADER_MAP[normalizeKey(h)]).length;
    if (recognized > 0) {
      headerRowIdx = i;
      headers = row;
      break;
    }
  }

  // Aucune ligne d'en-tête reconnue → fallback positionnel sur row 0
  // (ordre : Prénom, Nom, Entreprise, Email, Téléphone, Ville, Secteur, Canal, Statut, Score, Notes)
  if (headerRowIdx === -1) {
    const POSITIONAL = [
      "prenom", "nom", "entreprise", "email", "phone", "ville",
      "secteur", "canal", "statut", "score", "notes",
    ];
    const dataRows = aoa.slice(0); // tout est data
    return dataRows.map((row) => {
      const out: PartialProspect = {};
      POSITIONAL.forEach((key, i) => {
        const v = row[i];
        if (v == null || v === "") return;
        if (key === "score") {
          const n = Number(v);
          if (Number.isFinite(n)) out.score = Math.max(1, Math.min(5, Math.round(n)));
        } else {
          (out as Record<string, string>)[key] = String(v).trim();
        }
      });
      return out;
    });
  }

  const headerMap = mapHeaderRow(headers);
  const dataRows = aoa.slice(headerRowIdx + 1);

  return dataRows.map((row) => {
    const out: PartialProspect = {};
    headers.forEach((h, i) => {
      const key = headerMap[i];
      if (!key) return;
      const val = row[i];
      if (val == null || val === "") return;
      if (key === "score") {
        const n = Number(val);
        if (Number.isFinite(n)) out.score = Math.max(1, Math.min(5, Math.round(n)));
      } else {
        (out as Record<string, string>)[key] = String(val).trim();
      }
    });
    return out;
  });
}

// Parse DOCX → regex extract emails + phones, 1 prospect par email trouvé
async function parseDocx(buf: Buffer): Promise<PartialProspect[]> {
  const mammoth = await import("mammoth");
  const result = await mammoth.default.extractRawText({ buffer: buf });
  return extractFromText(result.value);
}

// Parse PDF → idem. pdf-parse v2 expose la classe PDFParse (pas une fonction par défaut).
async function parsePdf(buf: Buffer): Promise<PartialProspect[]> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  try {
    const result = await parser.getText();
    return extractFromText(result.text);
  } finally {
    await parser.destroy();
  }
}

// Extraction fallback pour texte libre (PDF/DOCX) : 1 ligne = 1 email trouvé + contexte
function extractFromText(text: string): PartialProspect[] {
  const emailRe = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
  const phoneRe = /(?:\+41\s?|0041\s?|0)(?:\d{2}[\s.]?){4}\d{0,2}/g;

  const emails = Array.from(new Set((text.match(emailRe) ?? []).map((e) => e.toLowerCase())));
  const prospects: PartialProspect[] = [];

  for (const email of emails) {
    // Contexte : 300 chars autour de l'email
    const idx = text.toLowerCase().indexOf(email);
    const ctx = text.slice(Math.max(0, idx - 150), idx + 150);
    const phoneMatch = ctx.match(phoneRe)?.[0];

    // Heuristique : cherche "Prénom Nom" avec majuscules à proximité
    const nameMatch = ctx.match(/\b([A-ZÉÈÀÂÊÎÔÛÇ][a-zéèàâêîôûç]+)\s+([A-ZÉÈÀÂÊÎÔÛÇ][a-zéèàâêîôûç]+)\b/);

    prospects.push({
      email,
      prenom: nameMatch?.[1],
      nom: nameMatch?.[2],
      phone: phoneMatch,
      notes: `Importé depuis document — contexte : "${ctx.replace(/\s+/g, " ").trim().slice(0, 200)}"`,
    });
  }
  return prospects;
}

type ImportResult = { imported: number; skipped: number; errors: string[] };

async function createProspects(partials: PartialProspect[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };
  for (const p of partials) {
    // Skip seulement si la row est complètement vide (aucun champ)
    const hasAnyData = Object.values(p).some((v) => v !== undefined && v !== null && v !== "");
    if (!hasAnyData) {
      result.skipped += 1;
      continue;
    }
    try {
      await db.prospect.create({
        data: {
          prenom: p.prenom || "—",
          nom: p.nom || "—",
          entreprise: p.entreprise || null,
          ville: p.ville || null,
          canton: p.canton || null,
          npa: p.npa || null,
          adresse: p.adresse || null,
          email: p.email || null,
          phone: p.phone || null,
          instagram: p.instagram || null,
          linkedin: p.linkedin || null,
          siteWeb: p.siteWeb || null,
          secteur: p.secteur || "",
          canal: p.canal || "",
          statut: p.statut || "Nouveau",
          urgence: p.urgence || "Normale",
          score: p.score ?? 3,
          notes: p.notes || null,
          source: "IMPORT_CSV",
        },
      });
      result.imported += 1;
    } catch (e) {
      result.errors.push(`${p.email ?? p.nom ?? "?"} : ${(e as Error).message}`);
    }
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "fichier manquant (field 'file')" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    let partials: PartialProspect[];
    if (name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls")) {
      partials = await parseSpreadsheet(buf);
    } else if (name.endsWith(".docx")) {
      partials = await parseDocx(buf);
    } else if (name.endsWith(".pdf")) {
      partials = await parsePdf(buf);
    } else {
      return Response.json(
        { error: "format non supporté (attendus : .csv .xlsx .xls .docx .pdf)" },
        { status: 400 },
      );
    }

    if (partials.length === 0) {
      return Response.json(
        { error: "Aucun prospect détecté dans le fichier (vérifier colonnes ou contenu)" },
        { status: 422 },
      );
    }

    const result = await createProspects(partials);
    return Response.json({ ok: true, ...result, detected: partials.length });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
