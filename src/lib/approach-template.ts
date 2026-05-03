// Template mail d'approche Klaivia — format punchy, conversion-first.
//
// Structure (5 lignes max) :
//   1. Hook douloureux : phrase choc qui nomme leur problème
//   2. Agitation : la conséquence en une ligne
//   3. Solution : ce que Klaivia fait, en une ligne
//   4. Résultat : bénéfice concret, en une ligne
//   5. CTA urgence : action claire et directe
//
// Principes :
// - Pas de "Bonjour [prénom]" rallongé, pas de "j'ai vu", pas de "tombé sur"
// - Phrases courtes, mobile-friendly
// - Vouvoiement
// - Signature ajoutée par mailer.ts (HTML pro à l'envoi)

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

type ServicePitch = {
  subject: (entreprise: string) => string;
  hook: string;       // ligne 1 — problème choc
  agitation: string;  // ligne 2 — conséquence
  solution: string;   // ligne 3 — ce qu'on fait
  result: string;     // ligne 4 — bénéfice
  cta: string;        // ligne 5 — action
};

// Pitches par service — punchy, 5 lignes
const SERVICE_PITCHES: Record<ApproachService, ServicePitch> = {
  web: {
    subject: (e) => `Le site de ${e} fait fuir vos prospects`,
    hook: "Votre site web fait fuir vos prospects.",
    agitation: "En quelques secondes, ils décident — et partent si ça ne convertit pas.",
    solution: "Nous créons des sites qui captent, rassurent et transforment en clients.",
    result: "Résultat : plus de demandes entrantes, sans effort.",
    cta: "Contactez-nous dès aujourd'hui pour mettre en ligne un site web premium et arrêter de perdre des clients.",
  },
  automation: {
    subject: (e) => `${e} : combien d'heures perdues chaque semaine ?`,
    hook: "Vos tâches répétitives volent vos heures.",
    agitation: "Chaque semaine, des dizaines d'heures partent en relances, devis, suivis manuels.",
    solution: "Nous automatisons vos process : qualification, relances, devis, agenda, facturation.",
    result: "Résultat : 10 à 20 heures récupérées par semaine, sans embaucher.",
    cta: "Parlons-en cette semaine — je vous montre concrètement ce qu'on automatiserait pour vous.",
  },
  agent: {
    subject: (e) => `Vos clients appellent. Personne ne répond chez ${e} ?`,
    hook: "Vos clients vous appellent. Personne ne répond.",
    agitation: "Chaque appel manqué = un client qui passe à la concurrence.",
    solution: "Nous déployons un agent IA qui répond 24/7, qualifie et planifie les RDV à votre place.",
    result: "Résultat : zéro appel perdu, plus de RDV, plus de clients signés.",
    cta: "Je peux vous montrer un agent qui tourne déjà chez un client — 10 minutes en visio.",
  },
};

// Hook spécifique au secteur — remplace le hook générique du service si match
const SECTOR_HOOKS: { match: RegExp; hooks: Partial<Record<ApproachService, string>> }[] = [
  {
    match: /avocat|juridique|notaire|étude/i,
    hooks: {
      agent: "Un client en panique appelle votre cabinet à 19h. Personne ne répond.",
      web: "Le site de votre cabinet n'inspire pas confiance. Les clients passent au concurrent.",
      automation: "Trop de qualification à la main avant chaque dossier — temps perdu, dossiers perdus.",
    },
  },
  {
    match: /immobilier|courtage|courtier/i,
    hooks: {
      agent: "Un prospect immo non rappelé en 5 min part chez la concurrence dans 80% des cas.",
      web: "Votre site immo perd des leads : trop lent, formulaire compliqué, pas mobile.",
      automation: "Vous perdez des heures à qualifier visites et budgets — l'IA peut le faire avant vous.",
    },
  },
  {
    match: /coiffure|beauté|esthét|salon|spa|barber/i,
    hooks: {
      agent: "Le téléphone sonne. Vous coupez. Une cliente part en silence.",
      web: "Votre site beauté ne donne pas envie de réserver — les clients vont chez Salonkee.",
      automation: "Rappels SMS, gestion annulations, reconfirmations : l'IA gère tout sans effort.",
    },
  },
  {
    match: /thérap|psy|ostéo|physio|santé|kiné|chiro/i,
    hooks: {
      agent: "Pendant chaque consultation, des patients tentent de vous joindre. En vain.",
      web: "Votre site santé ne rassure pas — les nouveaux patients hésitent à prendre RDV.",
      automation: "Confirmations, rappels, paperasse : tout ça peut tourner tout seul.",
    },
  },
  {
    match: /artisan|plomb|électric|menuiser|peintre|carrel|sanitaire|chauffag/i,
    hooks: {
      agent: "Sur chantier, vous décrochez ou pas ? Les deux options vous coûtent cher.",
      web: "Votre site n'est plus dans la première page Google — les demandes baissent.",
      automation: "Vous perdez des heures à faire des devis. L'IA peut les pré-remplir.",
    },
  },
  {
    match: /fiduc|compta|expert.compt|fiscal/i,
    hooks: {
      agent: "Les mêmes 10 questions reviennent chaque semaine — et elles vous coûtent cher.",
      web: "Votre site fiduciaire renvoie une image old-school — les prospects passent ailleurs.",
      automation: "Suivi documents, relances, classification : tout ça peut être automatisé.",
    },
  },
  {
    match: /coach|consult|formateur|formation/i,
    hooks: {
      agent: "Combien de \"appels découverte\" finissent sans signature ? Beaucoup.",
      web: "Votre site coach ne convertit pas — pas assez de preuves, pas de réservation directe.",
      automation: "Onboarding, séquences email, relances clients : laissez l'IA s'en charger.",
    },
  },
  {
    match: /agence|digital|marketing|communication/i,
    hooks: {
      agent: "Vous automatisez vos clients. Et vous, votre commercial entrant ?",
      web: "Votre site agence ne fait pas le job — vos prospects ne voient pas votre valeur.",
      automation: "Brief, qualification, suivi projet : autant de tâches pour automatiser.",
    },
  },
  {
    match: /e.commerce|ecommerce|boutique|shop|retail/i,
    hooks: {
      agent: "Un visiteur a une question. Personne ne répond. Panier abandonné.",
      web: "Votre site e-commerce perd des ventes : lent, mal optimisé, pas assez rassurant.",
      automation: "Suivi commandes, retours, relances panier abandonné — automatisable à 100%.",
    },
  },
  {
    match: /saas|logiciel|tech|startup|software|app/i,
    hooks: {
      agent: "Votre support N1 traite les mêmes 10 questions chaque jour. Cher.",
      web: "Votre site SaaS ne convertit pas — pas assez clair, pas assez de social proof.",
      automation: "Qualification leads, onboarding utilisateurs, support N1 : l'IA s'en charge.",
    },
  },
  {
    match: /restau|café|hôtel|brasserie|bar/i,
    hooks: {
      agent: "Le téléphone sonne en plein service. Vous décrochez ? Vous perdez la salle.",
      web: "Votre site resto ne donne pas envie — pas de menu clair, pas de réservation.",
      automation: "Confirmations, rappels veille, gestion annulations : que de l'IA.",
    },
  },
];

function pickServicePitch(service: ApproachService, secteur: string | null): ServicePitch {
  const base = SERVICE_PITCHES[service];
  if (!secteur) return base;
  const sectorMatch = SECTOR_HOOKS.find((s) => s.match.test(secteur));
  if (!sectorMatch) return base;
  const sectorHook = sectorMatch.hooks[service];
  if (!sectorHook) return base;
  return { ...base, hook: sectorHook };
}

export type GeneratedApproachEmail = { subject: string; body: string };

// Substitue les placeholders {entreprise} / {prenom} / {nom} / {ville} dans un template
export function substituteVars(
  text: string,
  vars: { entreprise?: string | null; prenom?: string | null; nom?: string | null; ville?: string | null },
): string {
  return text
    .replace(/\{entreprise\}/g, vars.entreprise || "votre activité")
    .replace(/\{prenom\}/g, vars.prenom || "")
    .replace(/\{nom\}/g, vars.nom || "")
    .replace(/\{ville\}/g, vars.ville || "");
}

// Helper : retourne le template hardcodé sous forme {subjectTemplate, bodyTemplate}
// avec placeholders, pour permettre à l'utilisateur de partir d'un template propre
// quand il édite la version personnalisée.
export function getDefaultTemplate(service: ApproachService): {
  subjectTemplate: string;
  bodyTemplate: string;
} {
  const pitch = SERVICE_PITCHES[service];
  const subjectTemplate = pitch.subject("{entreprise}");
  const bodyTemplate = `Bonjour {prenom},

${pitch.hook}

${pitch.agitation}

${pitch.solution}

${pitch.result}

${pitch.cta}

Hugo
—
Klaivia · Agence IA & Sites Web
Sites web · Automatisations · Agents IA pour PME romandes
klaivia.ch · @klaivia.agency · contact@klaivia.ch`;
  return { subjectTemplate, bodyTemplate };
}

export function buildApproachEmail(
  p: ProspectInfo,
  service: ApproachService = "agent",
): GeneratedApproachEmail {
  const company = p.entreprise || `${p.prenom || ""} ${p.nom || ""}`.trim() || "votre activité";
  const firstName = p.prenom && p.prenom !== "—" ? p.prenom : null;
  const pitch = pickServicePitch(service, p.secteur);

  const subject = pitch.subject(company);
  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";

  // Format punchy : 5 lignes courtes + signature
  const body = `${greeting}

${pitch.hook}

${pitch.agitation}

${pitch.solution}

${pitch.result}

${pitch.cta}

Hugo
—
Klaivia · Agence IA & Sites Web
Sites web · Automatisations · Agents IA pour PME romandes
klaivia.ch · @klaivia.agency · contact@klaivia.ch`;

  return { subject, body };
}
