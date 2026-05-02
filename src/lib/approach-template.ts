// Template mail d'approche Klaivia — optimisé conversion cold email B2B PME romandes.
//
// Principes appliqués (cold email best practices) :
// - Objet 3-6 mots, casual, pattern-interrupt (pas "un mot rapide")
// - Corps 50-90 mots max → mobile-friendly, scannable
// - Framework PAS (Problème → Agitation → Solution)
// - Hook = observation spécifique métier (pas stat générique)
// - Coût formulé en temps perdu / cash perdu, pas en feature
// - CTA micro-engagement : "vous voulez que je vous montre ?" plutôt que "réservez un call"
// - Pas de "J'espère que ce mail vous trouve bien"
// - Vouvoiement, signature "Hugo — Klaivia"

type ProspectInfo = {
  prenom: string | null;
  nom: string | null;
  entreprise: string | null;
  ville: string | null;
  secteur: string | null;
  canal: string | null;
};

// Service Klaivia que tu proposes au prospect
export type ApproachService = "web" | "automation" | "agent";

export const APPROACH_SERVICE_LABELS: Record<ApproachService, string> = {
  web: "Site web",
  automation: "Automatisation IA",
  agent: "Agent IA",
};

type SectorPitch = {
  // Sujet : court, casual, pas vendeur
  subject: (entreprise: string) => string;
  // Hook : observation spécifique sur leur métier au quotidien
  hook: string;
  // Agitation : le coût concret du problème (temps, cash, RDV manqués)
  cost: string;
  // Solution : 1 phrase outcome-focused, pas "on déploie un agent IA"
  solution: string;
};

// Pitches par secteur — courts, ciblés, conversion-first
const SECTOR_PITCHES: { match: RegExp; pitch: SectorPitch }[] = [
  {
    match: /avocat|juridique|notaire|étude/i,
    pitch: {
      subject: (e) => `${e} — appels après 17h ?`,
      hook: "Combien d'appels votre cabinet reçoit après les heures de bureau ?",
      cost: "Chaque appel manqué = un client qui appelle un autre cabinet. La majorité ne rappellent jamais.",
      solution:
        "On installe un agent vocal qui filtre l'urgence (garde à vue, accident…) vs simple demande, qualifie le dossier et planifie un RDV.",
    },
  },
  {
    match: /immobilier|agence immobilière|courtage|courtier/i,
    pitch: {
      subject: (e) => `${e} — vos leads sont rappelés en combien de temps ?`,
      hook: "Un prospect immo non rappelé en 5 minutes part chez la concurrence dans 80% des cas.",
      cost: "Sur 100 leads/mois, 80 partent ailleurs simplement parce que personne n'a décroché à temps.",
      solution:
        "Un agent IA qui rappelle automatiquement vos leads en moins de 2 minutes, qualifie leur projet (achat/location, budget, timing) et bloque une visite directement dans votre agenda.",
    },
  },
  {
    match: /coiffure|beauté|esthét|salon|spa|barber/i,
    pitch: {
      subject: (e) => `${e} — RDV pris pendant que vous coupez ?`,
      hook: "Combien de fois par jour le téléphone sonne pendant que vous êtes avec une cliente ?",
      cost: "Chaque appel raté = une réservation perdue. Sur le mois, ça représente plusieurs centaines de francs.",
      solution:
        "Un agent vocal qui prend les RDV 24/7, gère les annulations, envoie les rappels SMS — et libère votre attention pour vos clientes en cabine.",
    },
  },
  {
    match: /thérap|psy|ostéo|physio|santé|kiné|chiro/i,
    pitch: {
      subject: (e) => `${e} — RDV pendant vos consultations ?`,
      hook: "La majorité des prises de RDV se font par téléphone, souvent quand vous êtes en consultation.",
      cost: "Vous rappelez le soir, le patient a déjà pris ailleurs. Sans secrétariat, c'est 20-30% de RDV perdus.",
      solution:
        "Un agent qui répond à votre place, qualifie la demande (première consultation / suivi / urgence) et place le RDV dans votre agenda.",
    },
  },
  {
    match: /artisan|plomb|électric|menuiser|peintre|carrel|sanitaire|chauffag/i,
    pitch: {
      subject: (e) => `${e} — devis qualifiés sans décrocher ?`,
      hook: "Sur chantier, vous décrochez ou pas ? Les deux options coûtent.",
      cost: "Décrocher = vous arrêtez votre travail. Pas décrocher = le client appelle votre concurrent.",
      solution:
        "Un agent IA qui répond, qualifie le devis (type de travaux, urgence, adresse) et vous envoie un récap par SMS le soir avec les vrais leads.",
    },
  },
  {
    match: /fiduc|compta|expert.compt|fiscal/i,
    pitch: {
      subject: (e) => `${e} — questions fiscales répétitives ?`,
      hook: "Combien de fois par semaine on vous demande la même chose sur les délais TVA ou la déclaration ?",
      cost: "Ces appels coûtent du temps de fiduciaire à 150 CHF/h pour répondre à des questions à 0 valeur ajoutée.",
      solution:
        "Un agent IA qui répond aux questions courantes 24/7, identifie les vrais nouveaux dossiers et vous transfère uniquement les demandes qualifiées.",
    },
  },
  {
    match: /coach|consult|formateur|formation/i,
    pitch: {
      subject: (e) => `${e} — qualifier sans appel découverte ?`,
      hook: "Vous passez combien de temps en appel découverte avec des prospects pas adaptés ?",
      cost: "1h par appel × 4 appels/semaine non convertis = un mois par an perdu à qualifier des gens qui ne signeront jamais.",
      solution:
        "Un agent IA qui qualifie les prospects en amont (objectif, budget, timing) et ne fait apparaître dans votre agenda que ceux qui matchent.",
    },
  },
  {
    match: /agence|digital|marketing|communication|web/i,
    pitch: {
      subject: (e) => `${e} — automatiser votre propre commercial ?`,
      hook: "Vous automatisez le commercial de vos clients — et le vôtre, vous le gérez comment ?",
      cost: "La plupart des agences perdent 30% du temps commercial sur la qualification entrante et la prise de brief.",
      solution:
        "Un agent IA qui qualifie vos leads, prend les briefs courts en autonomie et ne vous bloque que pour les vraies opportunités à fort potentiel.",
    },
  },
  {
    match: /e.commerce|ecommerce|boutique|shop|retail/i,
    pitch: {
      subject: (e) => `${e} — questions clients avant achat ?`,
      hook: "Combien de visiteurs partent du site parce qu'ils ont une question et personne ne répond ?",
      cost: "Selon les études, 70% des paniers abandonnés le sont à cause d'une question sans réponse en moins de 30 secondes.",
      solution:
        "Un chat IA conversationnel sur votre site qui répond instantanément, recommande les bons produits et augmente le taux de conversion.",
    },
  },
  {
    match: /saas|logiciel|tech|startup|software|app/i,
    pitch: {
      subject: (e) => `${e} — support N1 en autonomie ?`,
      hook: "Combien de tickets de support N1 résolus chaque semaine répètent les mêmes 10 questions ?",
      cost: "Chaque ticket coûte 15-30 min à un dev. Multipliez par votre volume mensuel.",
      solution:
        "Un agent IA branché sur votre doc + base de tickets qui résout 60-80% du N1 en autonomie, et n'escalade au humain que les cas vraiment nouveaux.",
    },
  },
  {
    match: /restau|café|hôtel|brasserie|bar/i,
    pitch: {
      subject: (e) => `${e} — réservations 24/7 ?`,
      hook: "Combien de réservations vous prenez en plein service, en perdant l'attention de la salle ?",
      cost: "Une réservation manquée = couvert vide. 5 par semaine × 50 CHF = 13'000 CHF/an évaporés.",
      solution:
        "Un agent vocal qui prend les réservations 24/7, gère les modifications et envoie le rappel la veille — sans vous décrocher du service.",
    },
  },
];

// Fallback générique
const FALLBACK_PITCH: SectorPitch = {
  subject: (e) => `${e} — gain de temps évident`,
  hook: "Combien d'heures par semaine passez-vous sur des tâches répétitives qui pourraient tourner toutes seules ?",
  cost: "Chaque heure de tâche manuelle = une heure pas passée à servir vos clients ou faire grandir l'activité.",
  solution:
    "On construit des sites, des automatisations et des agents IA sur mesure pour les PME romandes — l'objectif est toujours le même : libérer votre temps et capter les clients qui passaient à côté.",
};

function pickPitch(secteur: string | null): SectorPitch {
  if (!secteur) return FALLBACK_PITCH;
  const found = SECTOR_PITCHES.find((p) => p.match.test(secteur));
  return found?.pitch ?? FALLBACK_PITCH;
}

// Référence canal — discrète, en début de phrase, pas vendeuse
function channelLine(canal: string | null, entreprise: string): string {
  const c = (canal || "").toLowerCase();
  if (c.includes("linkedin")) return `Vu votre activité LinkedIn pour ${entreprise}.`;
  if (c.includes("instagram")) return `J'ai jeté un œil au compte Insta de ${entreprise}.`;
  if (c.includes("référence") || c.includes("reference")) return `On m'a parlé de ${entreprise}.`;
  if (c.includes("événement") || c.includes("evenement")) return `Suite à notre rencontre.`;
  if (c.includes("inbound") || c.includes("site")) return `Merci pour votre passage sur le site Klaivia.`;
  if (c.includes("email")) return `Je me permets de vous écrire à propos de ${entreprise}.`;
  return `Je suis tombé sur ${entreprise}.`;
}

export type GeneratedApproachEmail = { subject: string; body: string };

// Subject + solution adaptés au service Klaivia proposé
function serviceSubject(service: ApproachService, company: string): string {
  switch (service) {
    case "web":
      return `Idée pour le site de ${company}`;
    case "automation":
      return `Tâches répétitives chez ${company} ?`;
    case "agent":
      return `Un agent IA pour ${company} ?`;
  }
}

function serviceSolution(service: ApproachService, company: string): string {
  switch (service) {
    case "web":
      return `On construit pour ${company} un site web rapide, mobile-first, optimisé pour la conversion. Pas un site "vitrine joli" — un site qui transforme les visiteurs en clients : prise de contact directe, formulaire qualifiant, parcours fluide.`;
    case "automation":
      return `On automatise les tâches répétitives de ${company} : qualification des leads entrants, relances clients, synchronisation agenda, génération de devis, suivi facturation. Le but : récupérer des heures chaque semaine sans embaucher.`;
    case "agent":
      return `On déploie pour ${company} un agent IA vocal et conversationnel qui répond aux appels et messages 24/7, qualifie les demandes, planifie les RDV. Comme un assistant dédié, mais qui ne dort jamais.`;
  }
}

function serviceCTA(service: ApproachService, company: string, firstName: string | null): string {
  const lead = firstName
    ? `Vous voulez que je vous montre`
    : `Je peux vous montrer`;
  switch (service) {
    case "web":
      return `${lead} 2-3 exemples de sites Klaivia qui ont transformé le commercial de PME similaires à ${company} ? 10 minutes en visio, sans engagement.`;
    case "automation":
      return `${lead} concrètement quelles tâches on automatiserait pour ${company} et le gain de temps estimé ? 10 minutes suffisent.`;
    case "agent":
      return `${lead} en live un agent IA qui tourne déjà chez un de nos clients ? 10 minutes pour voir le truc fonctionner.`;
  }
}

export function buildApproachEmail(
  p: ProspectInfo,
  service: ApproachService = "agent",
): GeneratedApproachEmail {
  const company = p.entreprise || `${p.prenom || ""} ${p.nom || ""}`.trim() || "votre activité";
  const firstName = p.prenom && p.prenom !== "—" ? p.prenom : null;
  const cityHint = p.ville ? ` (${p.ville})` : "";
  const pitch = pickPitch(p.secteur);

  const subject = serviceSubject(service, company);
  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  const intro = channelLine(p.canal, `${company}${cityHint}`);
  const cta = serviceCTA(service, company, firstName);
  const solution = serviceSolution(service, company);

  // Format scannable : 3-4 paragraphes courts.
  // La signature texte ci-dessous est visible dans la modal (le user sait ce qui sera envoyé).
  // À l'envoi, mailer.ts détecte le marker "—\nKlaivia" et remplace ces lignes par la
  // version HTML pro designée (logo + liens cliquables).
  const body = `${greeting}

${intro} ${pitch.hook}

${pitch.cost}

${solution}

${cta}

Hugo
—
Klaivia · Agence IA & Sites Web
Sites web · Automatisations · Agents IA pour PME romandes
klaivia.ch · @klaivia.agency · contact@klaivia.ch`;

  return { subject, body };
}
