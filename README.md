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
| `STRIPE_WEBHOOK_SECRET` | Vérifie le webhook Stripe (sinon `/webhooks/stripe` → 503) | — |
| `ADMIN_EMAILS` | E-mails (séparés par virgule) ayant accès à `/admin` | — |
| `PLAUSIBLE_DOMAIN` | Active la mesure d'audience Plausible (sinon aucune analytics) | — |

La marque (nom, domaine, email) vit dans **`lib/site.js`**. Les liens Stripe
sont dans `routes/tarifs.js`. Pour ajouter une commune, complétez `COMMUNES`
dans `lib/communes.js`.

## Avant la mise en production

- Compléter les `[À COMPLÉTER]` des pages légales (`routes/legal.js`).
- Fixer `SESSION_SECRET` et pointer `DATA_DIR` vers un **disque persistant**
  (sinon les données sont éphémères). Pour monter en charge, remplacer
  `lib/store.js` par une base managée (Postgres) derrière la même API.
- **Stripe → activation de compte (câblé)** : créez un endpoint webhook Stripe
  vers `https://<domaine>/webhooks/stripe` (événements `checkout.session.completed`
  et `customer.subscription.deleted`) puis renseignez `STRIPE_WEBHOOK_SECRET`.
  Le paiement active alors le compte ayant le même e-mail (ou un abonnement « en
  attente » réclamé à l'inscription). Sans la variable, l'endpoint renvoie 503 et
  l'inscription gratuite reste le parcours.
- **Vraie base de données** : le store JSON sur disque persistant convient au
  démarrage ; pour monter en charge, migrer `lib/store.js` vers Postgres (à
  valider sur une vraie instance avant mise en production).

## Déploiement & suivi

Guide pas à pas (mise en ligne, domaine, Stripe, données) : **[`DEPLOIEMENT.md`](DEPLOIEMENT.md)**.

`render.yaml` définit un service web Node (`npm install` / `npm start`, health
check `/health`) avec un disque persistant sur `DATA_DIR`.

Où voir les données : **`/admin`** (business — comptes, abonnements, MRR,
conformité ; réservé à `ADMIN_EMAILS`) · **Plausible** (visiteurs, via
`PLAUSIBLE_DOMAIN`) · **Stripe** (revenus) · **Render** (performances, logs).
