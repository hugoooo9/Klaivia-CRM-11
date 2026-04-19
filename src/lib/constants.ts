// Constantes métier Klaivia (enums textuels + mappings UI)

// Secteurs cibles de Klaivia — TPE/PME suisses-francophones qui gagnent à automatiser
export const SECTEURS = [
  "Thérapeute",
  "Artisan",
  "Fiduciaire",
  "Coach",
  "Agence",
  "E-commerce",
  "SaaS",
  "Autre",
] as const;
export type Secteur = (typeof SECTEURS)[number];

export const CANAUX = [
  "LinkedIn",
  "Email froid",
  "Instagram",
  "Référence",
  "Contenu / SEO",
  "Événement",
  "Inbound site",
] as const;
export type Canal = (typeof CANAUX)[number];

export const STATUTS_PROSPECT = [
  "Nouveau",
  "Contacté",
  "En discussion",
  "Démo planifiée",
  "Négociation",
  "Signé",
  "Perdu",
] as const;
export type StatutProspect = (typeof STATUTS_PROSPECT)[number];

export const URGENCES = ["Haute", "Normale", "Faible"] as const;
export type Urgence = (typeof URGENCES)[number];

// Offres agents IA Klaivia — pricing réaliste agence suisse (CHF/mois)
export const PACKS = [
  "Starter IA",       // 1 agent email sortant · qualification + relances
  "Growth IA",        // 2-3 agents · inbound + outbound + meeting booker
  "Scale IA",         // suite complète + intégrations custom + support prioritaire
  "Custom",           // sur-mesure, stack bespoke
] as const;
export type Pack = (typeof PACKS)[number];

export const PACK_MRR: Record<Pack, number> = {
  "Starter IA": 890,
  "Growth IA": 1890,
  "Scale IA": 3900,
  "Custom": 5900,
};

// Cas d'usage principaux que Klaivia automatise pour ses clients
export const USE_CASES = [
  "Prospection outbound",
  "Qualification inbound",
  "Relances clients",
  "Prise de RDV",
  "Support niveau 1",
  "Recouvrement",
  "Onboarding client",
  "Réactivation base dormante",
] as const;
export type UseCase = (typeof USE_CASES)[number];

// Stack actuel du prospect — informe l'intégration technique
export const OUTILS_ACTUELS = [
  "Gmail",
  "Outlook",
  "HubSpot",
  "Pipedrive",
  "Salesforce",
  "Notion",
  "Airtable",
  "Excel / rien",
  "Autre",
] as const;
export type OutilActuel = (typeof OUTILS_ACTUELS)[number];

// Volume email mensuel — clé de qualification (= potentiel d'automatisation)
export const VOLUMES_EMAIL = [
  "< 100 / mois",
  "100 – 500 / mois",
  "500 – 2 000 / mois",
  "2 000 – 10 000 / mois",
  "> 10 000 / mois",
] as const;
export type VolumeEmail = (typeof VOLUMES_EMAIL)[number];

// Probabilités de closing par statut (pour forecast pondéré du pipeline)
export const STATUT_PROBABILITY: Record<StatutProspect, number> = {
  "Nouveau": 0.05,
  "Contacté": 0.15,
  "En discussion": 0.3,
  "Démo planifiée": 0.5,
  "Négociation": 0.75,
  "Signé": 1,
  "Perdu": 0,
};

export const INTERACTION_TYPES = [
  "LinkedIn DM",
  "Email",
  "Appel",
  "Démo agent IA",
  "Audit process",
  "Relance",
  "Note",
] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const STATUTS_CLIENT = ["Actif", "Pause", "Churné"] as const;
export type StatutClient = (typeof STATUTS_CLIENT)[number];

// Couleurs par statut de prospect — version claire (pastel bg + strong text)
export const STATUT_COLOR: Record<StatutProspect, string> = {
  "Nouveau": "bg-sky-50 text-sky-700 border-sky-200",
  "Contacté": "bg-amber-50 text-amber-700 border-amber-200",
  "En discussion": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Démo planifiée": "bg-[color:var(--color-klaivia-orange-pale)] text-[color:var(--color-klaivia-orange)] border-[color:var(--color-klaivia-orange)]/30",
  "Négociation": "bg-teal-50 text-teal-700 border-teal-200",
  "Signé": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Perdu": "bg-rose-50 text-rose-700 border-rose-200",
};

export const URGENCE_DOT: Record<Urgence, string> = {
  "Haute": "bg-[color:var(--color-klaivia-red)]",
  "Normale": "bg-[color:var(--color-klaivia-gold)]",
  "Faible": "bg-[color:var(--color-klaivia-gray)]",
};

// Step suggéré quand on crée une interaction
export const NEXT_STEP_BY_TYPE: Record<InteractionType, number> = {
  "LinkedIn DM": 3,
  "Email": 3,
  "Appel": 5,
  "Démo agent IA": 2,
  "Audit process": 4,
  "Relance": 7,
  "Note": 0,
};

export const KLAIVIA_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/prospects", label: "Prospects", icon: "Users" },
  { href: "/prospector", label: "Agent prospecteur", icon: "Radar" },
  { href: "/actions-du-jour", label: "Actions du jour", icon: "Flame" },
  { href: "/clients", label: "Clients actifs", icon: "Trophy" },
  { href: "/kpis", label: "Saisir mes KPIs", icon: "LineChart" },
] as const;
