# Mettre Regloo en ligne — guide pas à pas

Aucune commande à taper : tout se fait depuis des interfaces web. Comptez ~30 min.

---

## 1. Déployer le site sur Render

Render lit déjà la configuration du projet (`render.yaml`).

1. Créez un compte sur **https://render.com** et cliquez **Connect GitHub** (autorisez le dépôt `FondationFlorence/Locataire`).
2. **New + → Blueprint**. Sélectionnez le dépôt `Locataire`. Render détecte `render.yaml` et propose le service **regloo**.
3. **Choisissez le plan :**
   - **Recommandé (données durables) :** plan **Starter** payant — il inclut le *disque persistant* (`/var/data`) qui conserve les comptes et les biens.
   - **Gratuit (pour tester) :** ouvrez `render.yaml`, supprimez le bloc `disk:` et mettez `plan: free`. ⚠️ Les données sont alors **effacées à chaque redéploiement**.
4. Cliquez **Apply / Deploy**. Au bout de 2–3 min, vous obtenez une URL du type `https://regloo.onrender.com`. Le site est en ligne.

---

## 2. Régler les variables d'environnement

Render → votre service **regloo** → onglet **Environment**. Vérifiez / ajoutez :

| Variable | Valeur | Rôle |
| --- | --- | --- |
| `SESSION_SECRET` | *(généré automatiquement)* | Sécurise les sessions |
| `DATA_DIR` | `/var/data` | Dossier des données (sur le disque) |
| `ADMIN_EMAILS` | **votre e-mail** (ex. `noeweil@gmail.com`) | Donne accès à la page **/admin** |
| `STRIPE_WEBHOOK_SECRET` | *(voir étape 4)* | Active les paiements |
| `UMAMI_WEBSITE_ID` + `UMAMI_SRC` | *(voir `umami/README.md`)* | Activent la mesure d'audience |

Après modification, Render redéploie automatiquement.

---

## 3. Brancher votre domaine `regloo.fr`

1. Render → service **regloo** → **Settings → Custom Domains → Add** → saisissez `regloo.fr` (et `www.regloo.fr`).
2. Render affiche un enregistrement DNS à créer. Allez chez votre registrar (là où vous avez acheté `regloo.fr`) et ajoutez l'enregistrement indiqué (souvent un `CNAME` vers `…onrender.com`, ou un `A`).
3. Attendez la propagation (quelques minutes à quelques heures). Le HTTPS est automatique.

---

## 4. Activer les paiements (Stripe)

1. Dans **Stripe → Developers → Webhooks → Add endpoint**.
2. URL : `https://regloo.fr/webhooks/stripe`. Événements : `checkout.session.completed` et `customer.subscription.deleted`.
3. Copiez le **Signing secret** (`whsec_…`) et collez-le dans la variable Render `STRIPE_WEBHOOK_SECRET`.
4. Pour chaque lien de paiement (Stripe → Payment links), réglez l'**URL de succès** sur `https://regloo.fr/confirmation?plan=starter` (resp. `professionnel`, `premium`).

À partir de là : un paiement active automatiquement le compte ayant le même e-mail. Tant que `STRIPE_WEBHOOK_SECRET` n'est pas réglé, l'inscription gratuite reste le seul parcours (rien ne casse).

---

## 5. Où regarder vos données

| Vous voulez voir… | Où | Comment |
| --- | --- | --- |
| **Comptes, abonnements, MRR, conformité du parc** | **votre site `/admin`** | Connectez-vous avec un e-mail listé dans `ADMIN_EMAILS`, puis ouvrez `https://regloo.fr/admin` (un lien « Admin » apparaît dans l'app). |
| **Visiteurs, pages vues, sources** | **Umami** (auto-hébergé) | Déployez Umami (Docker ou Render) puis réglez `UMAMI_WEBSITE_ID` + `UMAMI_SRC`. Mode d'emploi complet : **[`umami/README.md`](umami/README.md)**. Sans cookies, conforme RGPD, sans bandeau. |
| **Revenus, paiements, churn, factures** | **Stripe** | Le tableau de bord Stripe fournit MRR, encaissements et relances nativement. |
| **Performances techniques (temps de réponse, CPU, mémoire, uptime, logs)** | **Render** | Service **regloo** → onglets **Metrics**, **Logs**, **Events**. |

---

## 6. Sauvegardes & suite

- **Sauvegarde des données** : avec le disque persistant, tout vit dans `/var/data/db.json`. Récupérez-le de temps en temps (Render → **Shell** → `cat /var/data/db.json`).
- **Passage à l'échelle** : au-delà de quelques centaines de comptes, migrez le stockage (`lib/store.js`) vers **Postgres** (Render propose une base managée). À valider sur une vraie instance avant bascule.
