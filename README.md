# Klaivia CRM

CRM interne de **Klaivia** — agence suisse-romande spécialisée dans la vente d'agents IA (automatisation email) pour les PME (thérapeutes, artisans, fiduciaires, coachs).

## Stack technique

- **Framework** : Next.js 16 (App Router, Turbopack)
- **Langage** : TypeScript (strict, pas de `any`)
- **UI** : Tailwind CSS v4 + shadcn/ui + Lucide icons
- **Base de données** : SQLite via Prisma 6
- **Formulaires** : react-hook-form + Zod
- **Charts** : Recharts
- **Drag & drop** : @hello-pangea/dnd (Kanban)
- **Toasts** : sonner
- **Polices** : DM Serif Display (titres) + DM Sans (corps)

## Palette Klaivia

Navy `#1B2A4A` · Navy-mid `#243660` · Violet `#5B3FA6` · Violet-light `#7B5DC8` · Gold `#C9A84C` · Green `#2ECC8B` · Red `#E8445A`

## Installation

```bash
# 1. Dépendances
npm install

# 2. Base de données (migration + seed de 8 prospects de démo)
npm run db:migrate
npm run db:seed

# 3. Lancer en dev (http://localhost:3000)
npm run dev
```

La base SQLite est générée dans `prisma/klaivia.db`.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Serveur de dev (Turbopack) |
| `npm run build` | Build de production |
| `npm start` | Serveur production |
| `npm run db:migrate` | Applique les migrations Prisma |
| `npm run db:seed` | Seed 8 prospects + 18 interactions + 4 semaines de KPIs |
| `npm run db:studio` | Prisma Studio pour inspecter la base |

## Structure

```
src/
├── app/
│   ├── dashboard/           # KPIs, charts MRR/funnel/secteur/canal + actions feed
│   ├── prospects/           # Liste (table/kanban), création, édition, fiche détaillée
│   ├── clients/             # Portefeuille clients actifs + NPS + churn
│   ├── actions-du-jour/     # 3 sections : aujourd'hui / en retard / démos de la semaine
│   ├── kpis/                # Saisie hebdomadaire + historique
│   ├── api/export/          # Export CSV/JSON des prospects/clients/interactions
│   └── layout.tsx           # Sidebar + Topbar + command palette globale (Ctrl+K)
├── actions/                 # Server Actions (prospects, interactions, clients, kpis)
├── components/              # UI réutilisable (prospects, clients, dashboard, kpis, layout)
├── lib/                     # db, constants, validations (zod), format, stats
└── prisma/                  # schéma + seed
```

## Fonctionnalités principales

- **Pipeline de prospects** avec 7 statuts (Nouveau → Contacté → En discussion → Démo planifiée → Négociation → Signé / Perdu)
- **Double vue prospects** : tableau triable/filtrable **ou** Kanban drag-and-drop
- **Fiche prospect** avec timeline d'interactions, édition inline, conversion en client
- **Dashboard** : MRR, taux de conversion, relances en retard, charts MRR/funnel/secteur/canal, feed d'actions
- **Clients actifs** : MRR/ARR/NPS moyen, édition inline NPS et prochain RDV, gestion du churn
- **Actions du jour** : 3 sections triées par urgence, quick-actions (fait, reporter 1/3/7 j, ajouter note)
- **KPIs hebdomadaires** : DM envoyés, réponses, appels, démos, closes, MRR avec upsert sur (année, semaine)
- **Export CSV/JSON** : `/api/export?type=prospects|clients|interactions&format=csv|json`
- **Recherche globale** : Ctrl+K ouvre une palette de commandes (navigation + recherche prospects/clients)

## Mail d'approche optimisé

Le bouton **« Mail d'approche »** sur la fiche prospect ouvre un modal avec un mail pré-rempli, personnalisé à partir des infos du prospect (entreprise, prénom, ville, secteur, canal d'acquisition).

### Comment ça marche

- **Template déterministe** dans `src/lib/approach-template.ts` — pas d'API externe, pas de clé, pas de coût.
- Adapte automatiquement l'accroche et la proposition de valeur selon le **secteur** détecté (avocat, immobilier, coiffure, thérapeute, artisan, fiduciaire, agence, e-commerce, SaaS, restauration…).
- Référence subtile au **canal d'acquisition** (LinkedIn, Instagram, référence, événement, inbound site).
- Personnalisation **prénom** + **entreprise** + **ville** + signature `Hugo — Klaivia`.

### Workflow

1. Ouvrir la fiche prospect → cliquer **« Mail d'approche »**
2. Le mail apparaît pré-rempli (objet + corps), modifiable librement
3. **Régénérer** (rebuild template, instantané), **Brouillon** (sauvegarde sans envoyer), **Envoyer** (confirmation → SMTP + statut auto Nouveau→Contacté + archive)
4. L'historique des mails (envoyés + brouillons) s'affiche en bas de la fiche prospect, expandable, brouillons réouvrables

### Personnaliser les hooks par secteur

Édite `src/lib/approach-template.ts` :
- `hookForSecteur(secteur)` — phrase d'accroche
- `valuePropForSecteur(secteur)` — proposition de valeur Klaivia

Les deux fonctions matchent par mot-clé sur le secteur. Ajouter un secteur = ajouter une branche `if (s.includes("...")) return "...";`.

## Conventions code

- **Variables** : anglais (`prospectId`, `handleClick`)
- **UI & commentaires** : français (audience Klaivia)
- **Server Actions** : toutes les mutations passent par `src/actions/*` avec `revalidatePath`
- **Prisma** : utilisé uniquement en Server Components / Server Actions (jamais côté client)
- **Validation** : Zod sur tous les formulaires (schemas dans `src/lib/validations.ts`)

## Licence

Projet interne Klaivia — non diffusé.
