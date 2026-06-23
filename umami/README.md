# Umami — analytics auto-hébergée pour Regloo

Umami est une appli **séparée** (web + base Postgres). On la déploie une fois,
puis on colle deux variables dans Regloo. Aucune donnée visiteur ne transite par
un tiers, pas de cookies, conforme RGPD (aucun bandeau requis).

## Étape 1 — Déployer le serveur Umami (au choix)

**Option A · Docker (VPS).** Sur une machine avec Docker :
```bash
cd umami
# éditez docker-compose.yml : APP_SECRET + POSTGRES_PASSWORD
docker compose up -d
```
Umami écoute sur `http://VOTRE_IP:3001`. Placez-le derrière HTTPS (Caddy, Nginx,
Traefik) pour la prod.

**Option B · Render.** Déployez `umami/render.yaml` comme **nouveau** Blueprint
Render (séparé de Regloo). Il crée un service `umami` + une base Postgres.

## Étape 2 — Configurer Umami

1. Ouvrez Umami → connectez-vous (`admin` / `umami`) → **changez le mot de passe**.
2. **Settings → Websites → Add website** : nom « Regloo », domaine `regloo.fr`.
3. Notez le **Website ID** (UUID) et l'URL du script (`https://<umami>/script.js`).

## Étape 3 — Brancher Regloo

Sur le service **regloo** (Render → Environment), ajoutez :

| Variable | Valeur |
| --- | --- |
| `UMAMI_WEBSITE_ID` | l'UUID copié |
| `UMAMI_SRC` | `https://<votre-umami>/script.js` |

Regloo redéploie : le script de suivi est alors injecté sur toutes les pages
(`views/partials/head.ejs`). Sans ces deux variables, **aucun script n'est
chargé** — analytics désactivée par défaut.

## Vérifier

Ouvrez le site, naviguez quelques pages, puis regardez le tableau de bord
Umami : les visites doivent apparaître en quasi temps réel.
