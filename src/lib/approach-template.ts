// Template mail d'approche Klaivia — optimisé pour les PME romandes.
// Pas d'IA : génération déterministe à partir des infos de la fiche prospect.

type ProspectInfo = {
  prenom: string | null;
  nom: string | null;
  entreprise: string | null;
  ville: string | null;
  secteur: string | null;
  canal: string | null;
};

// Hook d'accroche par secteur — phrase courte qui montre qu'on connaît le métier
function hookForSecteur(secteur: string | null): string {
  const s = (secteur || "").toLowerCase();
  if (s.includes("avocat") || s.includes("juridique") || s.includes("notaire")) {
    return "les cabinets juridiques en Suisse romande perdent en moyenne 40% de leurs appels hors heures de bureau";
  }
  if (s.includes("immobilier") || s.includes("agence")) {
    return "dans l'immobilier, un prospect non rappelé dans les 5 minutes a 80% de chances de partir chez la concurrence";
  }
  if (s.includes("coiffure") || s.includes("beauté") || s.includes("esthét") || s.includes("salon")) {
    return "les salons de beauté gèrent en moyenne 30 à 50 appels par semaine — beaucoup pour la prise de RDV uniquement";
  }
  if (s.includes("thérap") || s.includes("santé") || s.includes("psy") || s.includes("ostéo") || s.includes("physio")) {
    return "la majorité des prises de RDV se passent encore par téléphone, souvent en dehors des consultations";
  }
  if (s.includes("artisan") || s.includes("plomb") || s.includes("électric") || s.includes("menuiser") || s.includes("peintre")) {
    return "les artisans qui répondent au téléphone pendant qu'ils sont sur chantier perdent du temps et des clients";
  }
  if (s.includes("fiduc") || s.includes("compta") || s.includes("expert-comptable")) {
    return "les fiduciaires reçoivent énormément de demandes répétitives qui pourraient être qualifiées en amont";
  }
  if (s.includes("coach") || s.includes("formation") || s.includes("consult")) {
    return "les coachs et consultants passent souvent plus de temps à qualifier les prospects qu'à délivrer leurs prestations";
  }
  if (s.includes("agence") || s.includes("digital") || s.includes("marketing") || s.includes("communication")) {
    return "même les agences digitales ont peu de temps pour optimiser leur propre process commercial";
  }
  if (s.includes("e-commerce") || s.includes("ecommerce") || s.includes("boutique en ligne")) {
    return "le support e-commerce est une charge lourde — surtout pour les questions répétitives avant achat";
  }
  if (s.includes("saas") || s.includes("logiciel") || s.includes("tech")) {
    return "les boîtes tech connaissent l'IA mais l'implémentation interne sur le commercial reste rare";
  }
  if (s.includes("restau") || s.includes("café") || s.includes("hôtel")) {
    return "la restauration prend encore beaucoup de réservations par téléphone, souvent au mauvais moment";
  }
  // Fallback générique
  return "beaucoup de PME romandes perdent du temps sur des tâches répétitives qui pourraient être automatisées";
}

// Proposition de valeur adaptée
function valuePropForSecteur(secteur: string | null): string {
  const s = (secteur || "").toLowerCase();
  if (s.includes("avocat") || s.includes("juridique") || s.includes("notaire")) {
    return "Chez Klaivia, on déploie des agents IA qui filtrent les appels urgents, qualifient les nouveaux clients et planifient les rendez-vous — même quand le cabinet est fermé.";
  }
  if (s.includes("immobilier") || s.includes("agence")) {
    return "Chez Klaivia, on construit des agents IA qui rappellent automatiquement les prospects en moins de 2 minutes, qualifient leur projet et bookent une visite.";
  }
  if (s.includes("coiffure") || s.includes("beauté") || s.includes("esthét") || s.includes("salon")) {
    return "Chez Klaivia, on installe un agent IA qui prend les RDV par téléphone 24/7, gère les annulations et envoie les rappels automatiques.";
  }
  if (s.includes("thérap") || s.includes("santé") || s.includes("psy") || s.includes("ostéo") || s.includes("physio")) {
    return "Chez Klaivia, on installe un agent IA qui prend les RDV téléphoniques pendant les consultations, sans nécessiter de secrétaire.";
  }
  if (s.includes("artisan") || s.includes("plomb") || s.includes("électric") || s.includes("menuiser") || s.includes("peintre")) {
    return "Chez Klaivia, on déploie un agent vocal qui qualifie les demandes de devis pendant que vous êtes sur chantier — et envoie un récap par SMS.";
  }
  if (s.includes("fiduc") || s.includes("compta") || s.includes("expert-comptable")) {
    return "Chez Klaivia, on automatise la qualification entrante : l'agent IA répond aux questions courantes et oriente les vrais leads vers vous.";
  }
  if (s.includes("agence") || s.includes("digital") || s.includes("marketing") || s.includes("communication")) {
    return "Chez Klaivia, on construit des agents IA pour vos clients — et aussi pour vos propres process internes (qualification, relance, prise de brief).";
  }
  if (s.includes("e-commerce") || s.includes("ecommerce") || s.includes("boutique en ligne")) {
    return "Chez Klaivia, on installe un agent IA conversationnel qui répond aux questions clients 24/7 et augmente le taux de conversion.";
  }
  if (s.includes("saas") || s.includes("logiciel") || s.includes("tech")) {
    return "Chez Klaivia, on intègre des agents IA spécialisés sur votre stack — qualification de leads, support N1, relance.";
  }
  if (s.includes("restau") || s.includes("café") || s.includes("hôtel")) {
    return "Chez Klaivia, on déploie un agent vocal qui prend les réservations 24/7, gère les modifications et libère le téléphone du service.";
  }
  return "Chez Klaivia, on construit des sites web, des automatisations sur mesure et des agents IA — pour libérer du temps sur les tâches répétitives et mieux convertir les visiteurs.";
}

// Référence canal d'acquisition (subtil — montre qu'on note le contexte)
function channelReference(canal: string | null): string {
  const c = (canal || "").toLowerCase();
  if (c.includes("linkedin")) return " (vu votre profil sur LinkedIn)";
  if (c.includes("instagram")) return " (vu votre compte Instagram)";
  if (c.includes("référence") || c.includes("reference")) return " — on m'a parlé de vous";
  if (c.includes("événement") || c.includes("evenement")) return " — suite à notre rencontre";
  if (c.includes("inbound") || c.includes("site")) return " — merci pour votre passage sur notre site";
  return "";
}

export type GeneratedApproachEmail = { subject: string; body: string };

export function buildApproachEmail(p: ProspectInfo): GeneratedApproachEmail {
  const company = p.entreprise || (`${p.prenom || ""} ${p.nom || ""}`.trim() || "votre activité");
  const firstName = p.prenom && p.prenom !== "—" ? p.prenom : null;
  const cityHint = p.ville ? ` à ${p.ville}` : "";
  const channelHint = channelReference(p.canal);
  const hook = hookForSecteur(p.secteur);
  const valueProp = valuePropForSecteur(p.secteur);

  const subject = `${company} — un mot rapide`;

  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";

  const body = `${greeting}

Je découvre ${company}${cityHint}${channelHint}. Saviez-vous que ${hook} ?

${valueProp}

Pour ${company}, je pense qu'il y a un vrai gain possible. ${
    firstName ? "Ça vous parle ?" : "Cette idée vous parle ?"
  } Si oui, je peux vous montrer concrètement ce que ça donnerait — 15 minutes, sans engagement.

Belle journée,
Hugo
Klaivia`;

  return { subject, body };
}
