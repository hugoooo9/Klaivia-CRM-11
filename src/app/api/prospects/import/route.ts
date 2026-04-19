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
  ville: "ville", city: "ville",
  email: "email", mail: "email", "e-mail": "email", courriel: "email",
  phone: "phone", "téléphone": "phone", telephone: "phone", tel: "phone", mobile: "phone",
  instagram: "instagram", insta: "instagram",
  linkedin: "linkedin",
  secteur: "secteur", industry: "secteur",
  canal: "canal", channel: "canal", source: "canal",
  statut: "statut", status: "statut", "étape": "statut",
  urgence: "urgence", priority: "urgence", priorité: "urgence",
  score: "score",
  notes: "notes", remarques: "notes", commentaires: "notes",
};

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function mapHeaderRow(headers: string[]): (string | null)[] {
  return headers.map((h) => HEADER_MAP[normalizeKey(h)] ?? null);
}

type PartialProspect = {
  prenom?: string;
  nom?: string;
  entreprise?: string;
  ville?: string;
  email?: string;
  phone?: string;
  instagram?: string;
  linkedin?: string;
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

// Parse CSV / XLSX via SheetJS
async function parseSpreadsheet(buf: Buffer): Promise<PartialProspect[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "buffer" });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
  if (json.length === 0) return [];
  const headers = Object.keys(json[0]);
  const headerMap = mapHeaderRow(headers);
  return json.map((row) => buildFromRow(row, headerMap, headers));
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
    // Minimum requis : un nom OU une entreprise (sinon on skip)
    if (!p.prenom && !p.nom && !p.entreprise && !p.email) {
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
          email: p.email || null,
          phone: p.phone || null,
          instagram: p.instagram || null,
          linkedin: p.linkedin || null,
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
