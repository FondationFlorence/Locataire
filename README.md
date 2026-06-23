# regloo

**Conformité des meublés de tourisme en France.** regloo réunit en un seul
tableau de bord les règles communales (plafonds 90/120 jours), la déclaration
Declaloc, le suivi DPE et les taxes de séjour — pour les conciergeries,
multi-propriétaires et gestionnaires de patrimoine.

Site marketing + page de tarifs. Express + EJS, sans base de données, sans
build front. Paiements via Stripe Checkout.

## Stack

- **Node.js 20+**, Express, EJS
- CSS vanilla (aucun framework, aucune étape de build)
- Stripe Checkout (liens hébergés) pour les abonnements

## Démarrage local

```bash
npm install
npm run dev          # http://localhost:3000  (PORT configurable)
```

## Pages

| Route                | Description                                  |
| -------------------- | -------------------------------------------- |
| `GET /`              | Page d’accueil (`views/layout.ejs`)          |
| `GET /tarifs`        | Tarifs — 3 plans + FAQ                        |
| `GET /confirmation`  | Confirmation post-paiement (`?plan=<clé>`)   |
| `GET /mentions-legales`, `/confidentialite`, `/cgv` | Pages légales |
| `GET /health`        | Health check (JSON)                          |
| `GET /robots.txt`, `/sitemap.xml` | SEO                             |

## Structure

```
server.js              Application Express (routes, 404, statique)
lib/site.js            Configuration de marque centralisée (nom, email, URL…)
routes/tarifs.js       Tarifs + confirmation (liens Stripe)
routes/legal.js        Pages légales
views/
  partials/            head, nav, footer mutualisés
  layout.ejs           Page d’accueil
  tarifs.ejs           Tarifs
  confirmation.ejs     Confirmation
  legal.ejs            Gabarit des pages légales
  404.ejs              Page d’erreur
public/
  css/                 shared.css + une feuille par page
  js/app.js            Menu mobile, révélations au défilement, FAQ
  favicon.svg, robots.txt, sitemap.xml
```

## Configuration

Tout ce qui est spécifique à la marque (nom, domaine, email de contact) vit
dans **`lib/site.js`** : un seul fichier à modifier pour rebrander.

Les liens Stripe sont dans `routes/tarifs.js`. Pour rediriger l’utilisateur
après paiement, configurez l’URL de succès de chaque lien Stripe vers
`https://<domaine>/confirmation?plan=<starter|professionnel|premium>`.

Avant publication, complétez les `[À COMPLÉTER]` des pages légales
(`routes/legal.js`) : raison sociale, SIREN, hébergeur, etc.

## Déploiement (Render)

`render.yaml` définit un service web Node. `buildCommand: npm install`,
`startCommand: npm start`, health check sur `/health`. Aucune variable
d’environnement obligatoire.
