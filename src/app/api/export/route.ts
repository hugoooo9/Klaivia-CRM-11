// API Route Handler — export des prospects en CSV ou JSON
// Usage : /api/export?format=csv&type=prospects (ou clients, interactions)
import { db } from "@/lib/db";

const VALID_TYPES = ["prospects", "clients", "interactions"] as const;
const VALID_FORMATS = ["csv", "json"] as const;
type ExportType = (typeof VALID_TYPES)[number];
type ExportFormat = (typeof VALID_FORMATS)[number];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = (url.searchParams.get("type") || "prospects") as ExportType;
  const format = (url.searchParams.get("format") || "csv") as ExportFormat;

  if (!VALID_TYPES.includes(type)) {
    return Response.json({ error: `Type invalide (attendu : ${VALID_TYPES.join(", ")})` }, { status: 400 });
  }
  if (!VALID_FORMATS.includes(format)) {
    return Response.json({ error: `Format invalide (attendu : ${VALID_FORMATS.join(", ")})` }, { status: 400 });
  }

  const rows = await fetchRows(type);
  const filename = `klaivia-${type}-${new Date().toISOString().slice(0, 10)}.${format}`;

  if (format === "json") {
    return new Response(JSON.stringify(rows, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const csv = toCSV(rows);
  // BOM utf-8 pour qu'Excel/Numbers ouvre les accents correctement
  return new Response("\ufeff" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function fetchRows(type: ExportType): Promise<Record<string, unknown>[]> {
  if (type === "prospects") {
    const prospects = await db.prospect.findMany({
      orderBy: { createdAt: "desc" },
    });
    return prospects.map((p) => ({
      id: p.id,
      prenom: p.prenom,
      nom: p.nom,
      entreprise: p.entreprise,
      ville: p.ville,
      email: p.email,
      phone: p.phone,
      instagram: p.instagram,
      linkedin: p.linkedin,
      secteur: p.secteur,
      canal: p.canal,
      statut: p.statut,
      urgence: p.urgence,
      score: p.score,
      packInteret: p.packInteret,
      budgetEstime: p.budgetEstime,
      setupEstime: p.setupEstime,
      dateContact: p.dateContact.toISOString(),
      prochainStep: p.prochainStep?.toISOString() ?? "",
      notes: p.notes,
      raisonPerte: p.raisonPerte,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  if (type === "clients") {
    const clients = await db.client.findMany({
      include: { prospect: true },
      orderBy: { dateDebut: "desc" },
    });
    return clients.map((c) => ({
      id: c.id,
      prenom: c.prospect.prenom,
      nom: c.prospect.nom,
      entreprise: c.prospect.entreprise,
      email: c.prospect.email,
      phone: c.prospect.phone,
      adresse: c.prospect.adresse,
      npa: c.prospect.npa,
      ville: c.prospect.ville,
      canton: c.prospect.canton,
      siteWeb: c.prospect.siteWeb,
      linkedin: c.prospect.linkedin,
      instagram: c.prospect.instagram,
      pack: c.pack,
      mrrCHF: c.mrrCHF,
      setupCHF: c.setupCHF,
      dateDebut: c.dateDebut.toISOString(),
      prochainRDV: c.prochainRDV?.toISOString() ?? "",
      nps: c.nps,
      statut: c.statut,
      notes: c.notes,
    }));
  }

  // interactions
  const interactions = await db.interaction.findMany({
    include: { prospect: { select: { prenom: true, nom: true, entreprise: true } } },
    orderBy: { createdAt: "desc" },
  });
  return interactions.map((i) => ({
    id: i.id,
    createdAt: i.createdAt.toISOString(),
    type: i.type,
    prospectPrenom: i.prospect.prenom,
    prospectNom: i.prospect.nom,
    prospectEntreprise: i.prospect.entreprise,
    contenu: i.contenu,
  }));
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCSV(row[h])).join(","));
  }
  return lines.join("\n");
}

function escapeCSV(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  // Si la valeur contient virgule, guillemet ou retour ligne, on la guillemette
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
