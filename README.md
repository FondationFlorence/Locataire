# Regloo

**L'orchestrateur de conformité pour la location courte durée en France.**
Regloo réunit en un seul tableau de bord les règles communales (plafonds
90/120 jours), la déclaration en mairie / numéro d'enregistrement, le suivi
DPE et les taxes de séjour — pour les conciergeries, multi-propriétaires et
gestionnaires de patrimoine.

Le dépôt contient **le site marketing** (accueil, tarifs, pages légales) **et
le cœur produit** : comptes + un tableau de bord où chaque lot est évalué
contre les règles de sa commune.

## Stack

- **Node.js 20+**, Express, EJS — CSS vanilla, aucune étape de build
- Sessions (`express-session`), mots de passe hachés avec `crypto.scrypt`
  (aucune dépendance native)
- Persistance par fichier JSON (`lib/store.js`, sous `DATA_DIR`)
- Stripe Checkout (liens hébergés) pour les abonnements

## Démarrage local

```bash
npm install
npm run dev          # http://localhost:3000
```

## Pages

| Route | Description |
| --- | --- |
| `GET /` | Accueil (`views/layout.ejs`) |
| `GET /tarifs`, `/confirmation` | Tarifs + confirmation paiement |
| `GET /mentions-legales`, `/confidentialite`, `/cgv` | Pages légales |
| `GET /inscription`, `/connexion`, `POST /deconnexion` | Comptes |
| `GET /app` | Tableau de bord de conformité *(auth)* |
| `… /app/biens/*` | Ajout / détail / modification / suppression de biens *(auth)* |
| `GET /health`, `/robots.txt`, `/sitemap.xml` | Technique / SEO |

## Cœur produit

`lib/communes.js` encode les règles par commune (plafond de jours,
enregistrement, changement d'usage). `lib/compliance.js` évalue chaque bien et
produit un statut (`ok` / `attention` / `critique`) + des alertes avec l'action
à mener. Le tableau de bord agrège le tout sur le portefeuille.

> **Limite assumée** : jours loués, DPE et numéros sont **saisis manuellement**.
> Les synchronisations Airbnb/Booking et téléservices mairies ne sont pas encore
> implémentées, et les règles communales sont **indicatives** (pas un conseil
> juridique). Le tableau de bord l'indique dans un bandeau.

## Structure

```
server.js              Express : sessions, routes, 404
lib/site.js            Configuration de marque (nom, email, URL…)
lib/communes.js        Moteur de règles par commune
lib/compliance.js      Évaluation de conformité + alertes
lib/store.js           Persistance JSON (DATA_DIR)
lib/auth.js            Hachage scrypt + middlewares de session
routes/                tarifs.js · legal.js · app.js (produit)
views/                 partials/ · layout · tarifs · legal · app/ (dashboard…)
public/css/            shared.css + une feuille par page (dont app.css)
public/{brand,logos,favicons}/  kit de marque
```

## Configuration

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `PORT` | Port HTTP | `3000` |
| `SESSION_SECRET` | Secret de session (à fixer en prod) | aléatoire au boot |
| `DATA_DIR` | Dossier du store JSON | `./data` |

La marque (nom, domaine, email) vit dans **`lib/site.js`**. Les liens Stripe
sont dans `routes/tarifs.js`. Pour ajouter une commune, complétez `COMMUNES`
dans `lib/communes.js`.

## Avant la mise en production

- Compléter les `[À COMPLÉTER]` des pages légales (`routes/legal.js`).
- Fixer `SESSION_SECRET` et pointer `DATA_DIR` vers un **disque persistant**
  (sinon les données sont éphémères). Pour monter en charge, remplacer
  `lib/store.js` par une base managée (Postgres) derrière la même API.
- **Stripe → compte non câblé** : payer sur `/tarifs` ne crée pas encore de
  compte. Le parcours honnête aujourd'hui est l'inscription gratuite. Brancher
  un webhook Stripe avant de facturer le produit.

## Déploiement (Render)

`render.yaml` définit un service web Node (`npm install` / `npm start`, health
check `/health`). Ajoutez un disque persistant monté sur `DATA_DIR` et la
variable `SESSION_SECRET`.
