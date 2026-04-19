# Agent Prospecteur — Suisse Romande

Agent IA autonome qui découvre, enrichit et qualifie des prospects B2B romands correspondant à l'ICP Klaivia.

## Pipeline

```
Cron 03:00 (ou POST /api/prospector/run)
   │
   ▼
 Zefix search par canton romand  (RATE_LIMITS.ZEFIX = 1s)
   │
   ▼  applyIcpFilter
 Filtre ICP strict : canton VD/GE/VS/FR/NE/JU/BE francophone
                   + NPA dans whitelist romande
                   + statut ACTIVE
                   + NOGA heuristique (sur champ `purpose`)
   │
   ▼  upsertFromZefix (dedupe sur numeroIDE)
 Prospect.source = AUTO_ZEFIX, pipelineAuto = NEW
   │
   ▼  enrichQueue (concurrency 1)
 localCh → Google Places → scraping site web
 Prospect.pipelineAuto = ENRICHED (ou SKIPPED)
   │
   ▼  scoringQueue (concurrency 3, Claude)
 Score ICP 0-100 (NOGA 40 + taille 20 + pain 30 + qualité 10)
 Prospect.pipelineAuto = QUALIFIED (score ≥ 60) | SKIPPED
   │
   ▼  À LA DEMANDE UNIQUEMENT (jamais en batch)
 POST /api/prospector/prospects/:id/generate-message
   → Refresh avis Google < 30j + recheck site
   → Claude génère phrase email + LinkedIn
   → ApproachMessage stocké, pipelineAuto = APPROACHED
```

## Architecture fichiers

```
src/lib/prospector/
├── constants.ts              NOGA whitelist, NPA romands, rate limits
├── optOut.ts                 Vérif LPD avant enrich + génération
├── client.ts                 Anthropic SDK (lazy)
├── queue.ts                  p-queue (remplace BullMQ sur SQLite)
├── cron.ts                   node-cron 03:00 Europe/Zurich
├── runImport.ts              Orchestrateur : fetch → filter → upsert → enqueue
├── sources/
│   ├── zefix.ts              API REST Zefix + heuristique NOGA via `purpose`
│   ├── localCh.ts            Scrape tél/site (fragile — sélecteurs DOM)
│   ├── googlePlaces.ts       Places API (New) — rating, avis, horaires
│   └── websiteScraper.ts     Cheerio, respect robots.txt
├── enrichment/
│   ├── dedupe.ts             Upsert sur numeroIDE (unique)
│   └── enrichProspect.ts     Orchestration 3 sources + logs
├── scoring/
│   └── icpScorer.ts          Claude : détection signaux douleur
└── messaging/
    └── approachGenerator.ts  On-demand, avec refresh avis < 30j

src/app/api/prospector/
├── run/route.ts              POST = trigger import  /  GET = queue stats
├── prospects/route.ts        GET liste filtrable
├── prospects/[id]/route.ts   GET détail + PATCH status
├── prospects/[id]/generate-message/route.ts  POST (ON_DEMAND | MANUAL_REGEN)
└── optout/route.ts           CRUD liste noire LPD

src/app/prospector/page.tsx   UI serveur + ProspectorClient.tsx (table + actions)
src/worker.ts                 Process standalone pour le cron
```

## Schéma Prisma (extensions)

`Prospect` (fusionné avec modèle manuel existant) reçoit :

| Champ | Type | Rôle |
|---|---|---|
| `source` | String | MANUAL \| AUTO_ZEFIX \| IMPORT_CSV |
| `enrichissementAuto` | Boolean | flag |
| `raisonSociale` | String? | nom RC |
| `numeroIDE` | String? @unique | CHE-xxx.xxx.xxx — clé dédupe |
| `canton`, `npa`, `adresse` | String? | localisation |
| `secteurNOGA` | String? | code NOGA (heuristique) |
| `tailleEntreprise` | Int? | nb employés |
| `googleRating`, `googleReviewsCount` | Float?, Int? | réputation |
| `signauxDouleur` | String? | JSON stringifié |
| `scoreICP` | Int? | 0-100 |
| `pipelineAuto` | String? | NEW \| ENRICHED \| QUALIFIED \| APPROACHED \| SKIPPED |
| `derniereEnrichAt` | DateTime? | dernier passage worker |

Modèles nouveaux : `Contact`, `ApproachMessage`, `EnrichmentLog`, `OptOut`.

## Lancer

```bash
# 1. installer deps + regénérer client Prisma
npm install
npx prisma migrate dev
npx prisma generate

# 2. configurer .env
cp .env.example .env
# renseigner ANTHROPIC_API_KEY, GOOGLE_PLACES_API_KEY

# 3. lancer l'appli Next
npm run dev

# 4. worker cron (dans un second terminal, process distinct)
PROSPECTOR_CRON=true npm run prospector:worker

# 5. (optionnel) trigger un import manuel immédiat
npm run prospector:run
# OU via HTTP
curl -X POST http://localhost:3000/api/prospector/run -H "content-type: application/json" -d '{"maxPerCanton":20}'
```

## Contraintes LPD / nLPD respectées

- ✅ Scraping B2B uniquement, emails génériques (info@, contact@) via `GENERIC_PREFIXES` filter
- ✅ Table `OptOut` consultée avant enrichissement ET avant génération message
- ✅ `robots.txt` respecté (parser minimal dans `websiteScraper.ts`)
- ✅ Rate limit 1 req/s Zefix, 1.5s local.ch
- ✅ User-Agent explicite : `KlaiviaBot/1.0 (+contact@klaivia.ch)`
- ✅ Logging complet (`EnrichmentLog`) pour traçabilité

## Limitations connues (MVP)

1. **NOGA via heuristique `purpose`** — Zefix n'expose pas NOGA directement (BFS/STATENT requis).  
   Impact : ~20% de faux négatifs sur codes limites. Amélioration : enrichir via API BFS.
2. **local.ch scraping fragile** — si DOM change, mettre à jour les sélecteurs.  
   Alternative payante : API swissdir.
3. **Pas de Playwright** — sites JS-heavy (React SPAs) non scrapés.  
   Si besoin, `npm i playwright && npx playwright install chromium` et adapter `websiteScraper.ts`.
4. **Taille entreprise rarement détectée** — nécessiterait crawling LinkedIn ou enrichissement payant.  
   MVP assume ≤20 si non détecté (score sizeScore = 10 par défaut).
5. **Avis Google refresh** — logique présente dans `approachGenerator.ts`, mais `placeId` n'est pas encore persisté en DB → refetch complet à chaque call. À optimiser.
6. **Queue in-memory** — perdue au restart du worker. Pour >10k prospects/jour, migrer vers BullMQ + Redis + PostgreSQL.

## Test end-to-end manuel

```bash
# 1. Trigger import limité
curl -X POST http://localhost:3000/api/prospector/run -H "content-type: application/json" -d '{"maxPerCanton":5}'

# → attendre 30-60s (queue background)

# 2. Vérifier prospects créés
curl http://localhost:3000/api/prospector/prospects?canton=VD&scoreMin=40 | jq

# 3. Générer message sur le premier
ID=$(curl -s http://localhost:3000/api/prospector/prospects?canton=VD | jq -r '.rows[0].id')
curl -X POST http://localhost:3000/api/prospector/prospects/$ID/generate-message | jq

# 4. Vérifier en DB
npx prisma studio
# → table Prospect : ligne avec source=AUTO_ZEFIX, pipelineAuto=APPROACHED
# → table ApproachMessage : 2 lignes (EMAIL + LINKEDIN) pour ce prospect
```
