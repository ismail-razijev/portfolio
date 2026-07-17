# Mirasia Gestion

Application de gestion pour le restaurant Mirasia (Verviers) : stock des plats surgelés, planning de préparation, ventes, statistiques et dashboard, avec authentification et une API testée automatiquement.

## Pourquoi ce projet

Mirasia propose une cuisine d'Asie centrale et du Caucase, avec des plats préparés à l'avance et stockés surgelés (manti, plats ouïghours, kazakhs, etc.). Ce projet remplace un suivi manuel par un vrai outil : savoir en un coup d'œil quel stock est bas, ce qui doit être préparé, et ce qui a été vendu.

C'est aussi un projet portfolio pensé pour démontrer une gamme de compétences complète : modélisation de base de données relationnelle, PL/pgSQL (triggers, fonctions, transactions), API REST, authentification, tests automatisés et conteneurisation.

## Ce que ça fait

- **Authentification** : accès protégé par identifiant/mot de passe, session sécurisée
- **Gestion des cuisines et des plats** : créer/modifier/activer/désactiver des plats, les rattacher à une cuisine, recherche et filtre par cuisine
- **Suivi du stock** : quantité disponible par plat, seuil d'alerte, dates de préparation/péremption, filtre "alertes uniquement"
- **Historique des mouvements de stock** : chaque changement de quantité est tracé automatiquement (trigger PL/pgSQL), consultable sur la page Stock
- **Ventes** : enregistrer la vente d'un plat décrémente le stock automatiquement, en priorité sur les lots les plus anciens (FIFO), via une fonction PL/pgSQL transactionnelle qui refuse la vente si le stock est insuffisant
- **Planning de préparation** : quoi préparer, quelle quantité, pour quand, avec un statut (prévue / en cours / terminée), filtre par statut, préparations en retard mises en évidence, filtre "en retard uniquement"
- **Statistiques** : chiffre d'affaires total, nombre de ventes, top des plats les plus vendus, chiffre d'affaires des 14 derniers jours (mini-graphiques en barres)
- **Dashboard** : vue d'ensemble (plats actifs, alertes de stock, préparations en attente), stock sous le seuil d'alerte, préparations prévues du jour

## Stack technique

- **Node.js + Express** : serveur et API REST
- **PostgreSQL** : base de données relationnelle (tables, contraintes, triggers, fonctions PL/pgSQL)
- **HTML / CSS / JavaScript** (vanilla, sans framework) : interface web
- **express-session** : authentification par session
- **helmet, express-rate-limit** : durcissement de sécurité basique
- **morgan** : logging des requêtes
- **node:test + supertest** : tests d'intégration automatisés de l'API
- **Docker / docker-compose** : conteneurisation (app + base de données)

## Structure du projet

```
mirasia-gestion/
├── src/
│   ├── index.js                 # Point d'entrée : middlewares, sessions, montage des routes
│   ├── db/
│   │   ├── pool.js              # Connexion PostgreSQL
│   │   ├── schema.sql           # Schéma complet (tables, contraintes, trigger V1.1)
│   │   ├── migration_v1_1.sql   # Contraintes CHECK + historique des mouvements + trigger
│   │   └── migration_v1_2.sql   # Table commandes + fonction PL/pgSQL fn_enregistrer_vente
│   ├── middleware/
│   │   └── auth.js              # Middleware requireAuth
│   ├── routes/
│   │   ├── auth.js              # Login / logout / statut de session
│   │   ├── cuisines.js          # CRUD cuisines
│   │   ├── plats.js             # CRUD plats
│   │   ├── stock.js             # CRUD stock + historique des mouvements
│   │   ├── preparations.js      # CRUD planning de préparation
│   │   ├── commandes.js         # Enregistrement des ventes (FIFO + transaction)
│   │   ├── statistiques.js      # Agrégats de ventes
│   │   └── dashboard.js         # Statistiques du tableau de bord
│   └── utils/
│       └── errors.js            # Traduction des erreurs PostgreSQL en réponses HTTP claires
├── public/                       # Frontend (servi statiquement par Express)
│   ├── login.html / login.js     # Page de connexion
│   ├── guard.js                  # Redirige vers login.html si non authentifié
│   ├── nav.js                    # Navigation + déconnexion
│   ├── index.html                # Dashboard
│   ├── plats.html                # Gestion des plats & cuisines (avec recherche/filtre)
│   ├── stock.html                # Gestion du stock + historique des mouvements
│   ├── preparations.html         # Planning de préparation (avec filtres)
│   ├── ventes.html                # Enregistrement des ventes
│   ├── statistiques.html          # Statistiques et mini-graphiques
│   └── style.css
├── tests/
│   └── api.test.js               # Tests d'intégration (14 cas, base de données dédiée)
├── Dockerfile
├── docker-compose.yml
└── .dockerignore
```

## Modèle de données

```
cuisines (id, nom)
plats (id, nom, id_cuisine → cuisines, prix, actif)
stock (id, id_plat → plats, quantite, seuil_alerte, date_preparation, date_peremption)
preparations (id, id_plat → plats, quantite_prevue, date_prevue, statut)
stock_mouvements (id, id_stock → stock, ancienne_quantite, nouvelle_quantite, date_mouvement)
commandes (id, id_plat → plats, quantite, prix_unitaire, date_commande)
```

Contraintes d'intégrité : quantités, prix et seuils ne peuvent pas être négatifs (`CHECK`), statuts limités à un ensemble de valeurs valides.

**Trigger PL/pgSQL** — `trg_log_mouvement_stock` : s'exécute automatiquement après chaque `UPDATE` sur `stock` et enregistre l'ancienne et la nouvelle quantité dans `stock_mouvements`, sans intervention du code applicatif.

**Fonction PL/pgSQL transactionnelle** — `fn_enregistrer_vente(id_plat, quantite)` : enregistre une vente en une seule transaction. Elle vérifie que le stock total est suffisant (sinon la vente est refusée et rien n'est modifié), puis décrémente les lots de stock du plus ancien au plus récent (FIFO, cohérent avec des plats surgelés à date de péremption), et insère la ligne dans `commandes`. Chaque décrément déclenche au passage le trigger d'historique ci-dessus.

## Authentification

L'accès à toute l'API (sauf `/api/health`, `/api/login`, `/api/me`) nécessite une session valide. Identifiant et mot de passe sont définis dans `.env` (`ADMIN_USERNAME`, `ADMIN_PASSWORD`). Les pages du frontend redirigent automatiquement vers `login.html` si la session n'est pas valide (`public/guard.js`).

## Installation (sans Docker)

Prérequis : Node.js et PostgreSQL installés localement.

```bash
git clone https://github.com/ismail-razijev/portfolio.git
cd portfolio/mirasia-gestion
npm install
```

Créer la base de données et y appliquer le schéma :

```bash
psql -U postgres -c "CREATE DATABASE mirasia;"
psql -U postgres -d mirasia -f src/db/schema.sql
psql -U postgres -d mirasia -f src/db/migration_v1_2.sql
```

Créer un fichier `.env` à la racine du dossier (voir `.env.example`) :

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mirasia
DB_USER=postgres
DB_PASSWORD=ton-mot-de-passe-postgres
PORT=3000
ADMIN_USERNAME=choisis-un-identifiant
ADMIN_PASSWORD=choisis-un-mot-de-passe-solide
SESSION_SECRET=une-longue-chaine-aleatoire
```

```bash
npm start
```

L'application est accessible sur `http://localhost:3000` (redirige vers la page de connexion).

## Installation avec Docker

Prérequis : Docker et Docker Compose installés, fichier `.env` créé comme ci-dessus (`DB_HOST` sera automatiquement remplacé par `db` dans le conteneur).

```bash
docker compose up --build
```

Cela démarre deux conteneurs : `db` (PostgreSQL, schéma initialisé automatiquement au premier démarrage via `src/db/schema.sql` et `migration_v1_2.sql`) et `app` (le serveur Node.js), reliés par un réseau Docker interne. L'application est accessible sur `http://localhost:3000`.

> Configuration écrite et relue mais non testée sur cette machine (Docker n'y est pas installé) — à valider avant un déploiement.

## Tests automatisés

Les tests tournent sur une base de données dédiée (`mirasia_test`), jamais sur la base réelle du restaurant.

```bash
psql -U postgres -c "CREATE DATABASE mirasia_test;"
psql -U postgres -d mirasia_test -f src/db/schema.sql
psql -U postgres -d mirasia_test -f src/db/migration_v1_2.sql
npm test
```

14 tests couvrent : authentification (accès refusé sans session, login valide/invalide, déconnexion), CRUD plats/cuisines, contraintes CHECK, création de stock, vente avec décrément correct du stock et traçage dans l'historique, refus d'une vente si stock insuffisant, dashboard, statistiques, et refus de suppression d'une cuisine encore utilisée.

## Roadmap

- **V1** : stock, planning de préparation, dashboard *(fonctionnelle)*
- **V1.1** : contraintes d'intégrité, historique des mouvements (trigger), gestion d'erreurs centralisée, édition des plats *(fonctionnelle)*
- **V2** : authentification, module Ventes (fonction PL/pgSQL transactionnelle FIFO), statistiques, recherche/filtres, sécurité (helmet/rate-limit/logging), tests automatisés, Docker *(fonctionnelle)*
- **V3** : gestion multi-utilisateurs avec rôles, réservations, module de caisse complet, notifications automatiques (email) sur alerte de stock

## Statut

✅ V2 fonctionnelle
