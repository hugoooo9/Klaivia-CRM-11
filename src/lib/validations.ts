// Validations Zod pour les formulaires prospect / client / interaction
import { z } from "zod";
import {
  STATUTS_PROSPECT,
  URGENCES,
  PACKS,
  INTERACTION_TYPES,
  STATUTS_CLIENT,
} from "./constants";

export const prospectSchema = z.object({
  prenom: z.string().min(1, "Prénom requis").max(80),
  nom: z.string().min(1, "Nom requis").max(80),
  entreprise: z.string().max(120).optional().or(z.literal("")),
  ville: z.string().max(80).optional().or(z.literal("")),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  instagram: z.string().max(80).optional().or(z.literal("")),
  linkedin: z.string().max(120).optional().or(z.literal("")),
  secteur: z.string().max(80).optional().or(z.literal("")),
  canal: z.string().max(80).optional().or(z.literal("")),
  statut: z.enum(STATUTS_PROSPECT),
  urgence: z.enum(URGENCES),
  score: z.number().int().min(1).max(5),
  prochainStep: z.string().optional().or(z.literal("")), // ISO date
  packInteret: z.enum(PACKS).optional().or(z.literal("")),
  budgetEstime: z.number().int().nonnegative().optional(),
  notes: z.string().max(5000).optional().or(z.literal("")),
  raisonPerte: z.string().max(500).optional().or(z.literal("")),
});
export type ProspectInput = z.infer<typeof prospectSchema>;

export const interactionSchema = z.object({
  prospectId: z.string().min(1),
  type: z.enum(INTERACTION_TYPES),
  contenu: z.string().min(1, "Contenu requis").max(5000),
  nextStepDays: z.number().int().nonnegative().max(90).optional(),
});
export type InteractionInput = z.infer<typeof interactionSchema>;

export const clientSchema = z.object({
  prospectId: z.string().min(1),
  pack: z.enum(PACKS),
  mrrCHF: z.number().int().nonnegative(),
  setupCHF: z.number().int().nonnegative(),
  dateDebut: z.string().min(1), // ISO date
  prochainRDV: z.string().optional().or(z.literal("")),
  nps: z.number().int().min(0).max(10).optional(),
  statut: z.enum(STATUTS_CLIENT).default("Actif"),
  notes: z.string().max(5000).optional().or(z.literal("")),
});
export type ClientInput = z.infer<typeof clientSchema>;

export const kpiSchema = z.object({
  annee: z.number().int(),
  semaine: z.number().int().min(1).max(53),
  dmEnvoyes: z.number().int().nonnegative(),
  reponses: z.number().int().nonnegative(),
  appels: z.number().int().nonnegative(),
  demos: z.number().int().nonnegative(),
  closes: z.number().int().nonnegative(),
  mrr: z.number().int().nonnegative(),
});
export type KPIInput = z.infer<typeof kpiSchema>;
