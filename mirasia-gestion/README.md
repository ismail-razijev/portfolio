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
- **Carte du restaurant** : catégories, plats (description, prix ou variantes poulet/bœuf, végétarien, disponibilité), import de la carte réelle
- **Commande client** : menu public par catégorie, filtre végétarien, panier, mode sur place (numéro de table) / à emporter, "Jeudis Gourmands" sur réservation (Beshparmak et co., date calculée automatiquement)
- **Écran cuisine** : commandes entrantes triées par arrivée, groupées par table, statut recu → en_preparation → pret → servi
- **Interface salle** : grille des tables (libre/occupée/réservée), prise de commande, ajout d'articles à une commande en cours
- **Réservations de table** : demande publique, confirmation/annulation et assignation de table côté staff
- **Ventes restaurant** : chiffre d'affaires du jour, top plats, chiffre par catégorie, export CSV pour la compta

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
│   │   ├── statistiques.js      # Agrégats de ventes (module stock surgelé)
│   │   ├── dashboard.js         # Statistiques du tableau de bord
│   │   ├── categories.js        # CRUD catégories de la carte (staff)
│   │   ├── variantes.js         # CRUD variantes de prix (staff)
│   │   ├── menu.js              # GET carte publique (clients)
│   │   ├── tables.js            # Tables du restaurant (lecture publique, écriture staff)
│   │   ├── commandesClient.js   # Commandes client, cuisine, salle, stats, export CSV (auth mixte)
│   │   └── reservations.js      # Réservations de table (auth mixte)
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
│   ├── commande.html / .js / .css # Commande client (public, sans authentification)
│   ├── reservation.html / .js     # Demande de réservation (public)
│   ├── cuisine.html / .js / .css  # Écran cuisine (staff, polling ~8s)
│   ├── salle.html / .js / .css    # Interface salle/serveur (staff)
│   ├── menu.html / .js            # Admin carte : catégories, plats, variantes (staff)
│   ├── reservations-admin.html / .js # Gestion des réservations (staff)
│   ├── ventes-restaurant.html / .js  # Dashboard ventes restaurant + export CSV (staff)
│   └── style.css
├── tests/
│   └── api.test.js               # Tests d'intégration (25 cas, base de données dédiée)
├── Dockerfile
├── docker-compose.yml
└── .dockerignore
```

## Modèle de données

```
cuisines (id, nom)
plats (id, nom, id_cuisine → cuisines, prix, actif,
       id_categorie → categories, description, vegetarien, disponibilite, sur_commande, unite)
stock (id, id_plat → plats, quantite, seuil_alerte, date_preparation, date_peremption)
preparations (id, id_plat → plats, quantite_prevue, date_prevue, statut)
stock_mouvements (id, id_stock → stock, ancienne_quantite, nouvelle_quantite, date_mouvement)
commandes (id, id_plat → plats, quantite, prix_unitaire, date_commande)
```

Contraintes d'intégrité : quantités, prix et seuils ne peuvent pas être négatifs (`CHECK`), statuts limités à un ensemble de valeurs valides.

**Trigger PL/pgSQL** — `trg_log_mouvement_stock` : s'exécute automatiquement après chaque `UPDATE` sur `stock` et enregistre l'ancienne et la nouvelle quantité dans `stock_mouvements`, sans intervention du code applicatif.

**Fonction PL/pgSQL transactionnelle** — `fn_enregistrer_vente(id_plat, quantite)` : enregistre une vente en une seule transaction. Elle vérifie que le stock total est suffisant (sinon la vente est refusée et rien n'est modifié), puis décrémente les lots de stock du plus ancien au plus récent (FIFO, cohérent avec des plats surgelés à date de péremption), et insère la ligne dans `commandes`. Chaque décrément déclenche au passage le trigger d'historique ci-dessus.

### Carte du restaurant, commande client, salle & réservations (V1.3)

Module indépendant du stock surgelé ci-dessus (aucun lien avec `stock`/`commandes`/`fn_enregistrer_vente` — deux pipelines séparés qui partagent seulement la table `plats`) :

```
categories (id, nom, ordre_affichage)
variantes (id, id_plat → plats, nom, prix, actif)                 -- ex. poulet/bœuf
tables_salle (id, numero, capacite, statut)
commandes_client (id, mode, id_table → tables_salle, statut, nom_client,
                   telephone_client, date_commande, date_prevue, total)
commande_lignes (id, id_commande → commandes_client, id_plat → plats,
                 id_variante → variantes, quantite, prix_unitaire,
                 option_vegetarien, commentaire)
reservations (id, nom_client, telephone_client, date_reservation,
              heure_reservation, nb_personnes, id_table → tables_salle,
              statut, commentaire, date_creation)
```

**Fonction PL/pgSQL transactionnelle** — `fn_creer_commande_client(mode, id_table, nom_client, telephone_client, lignes)` : crée une commande et toutes ses lignes en une seule transaction, avec les prix toujours recalculés côté serveur (jamais fournis par le client). Applique aussi la règle des "Jeudis Gourmands" (plats `sur_commande = true`, ex. Beshparmak) : la date de retrait est calculée automatiquement (le prochain jeudi) et la commande est refusée si elle est passée après le mercredi 22h00 précédent — logique volontairement procédurale plutôt qu'une `CHECK` de table, pour ne pas bloquer les changements de statut faits par la cuisine après coup.

Import de la carte réelle (~70 plats) : `src/db/seed_menu.sql`, à appliquer manuellement (voir Installation).

## Authentification

L'accès à toute l'API (sauf `/api/health`, `/api/login`, `/api/me`) nécessite une session valide. Identifiant et mot de passe sont définis dans `.env` (`ADMIN_USERNAME`, `ADMIN_PASSWORD`). Les pages du frontend redirigent automatiquement vers `login.html` si la session n'est pas valide (`public/guard.js`).

Exception : `menu.js`, `tables.js` (en lecture), `commandesClient.js` et `reservations.js` servent à la fois des pages publiques (client) et des pages staff. Contrairement aux autres routeurs (une seule politique d'auth appliquée au montage dans `index.js`), `requireAuth` y est appliqué route par route, à l'intérieur du fichier.

## Installation (sans Docker)

Prérequis : Node.js et PostgreSQL installés localement.

```bash
git clone https://github.com/ismail-razijev/portfolio.git
cd portfolio/mirasia-gestion
npm install
```

> **Windows** : avant toute commande `psql -f`, exécuter `chcp 65001` dans le terminal. Sans ça, `psql` lit les fichiers `.sql` avec l'encodage de la console au lieu de l'UTF-8, ce qui corrompt silencieusement tous les caractères accentués insérés en base (ex. "Bœuf" devient "BÅ“uf") sans qu'aucune erreur ne remonte. Repéré en important `seed_menu.sql`.

Créer la base de données et y appliquer le schéma :

```bash
psql -U postgres -c "CREATE DATABASE mirasia;"
psql -U postgres -d mirasia -f src/db/schema.sql
psql -U postgres -d mirasia -f src/db/migration_v1_2.sql
psql -U postgres -d mirasia -f src/db/migration_v1_3.sql
```

Optionnel : importer la carte complète du restaurant (catégories, plats, variantes) :

```bash
psql -U postgres -d mirasia -f src/db/seed_menu.sql
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
psql -U postgres -d mirasia_test -f src/db/migration_v1_3.sql
npm test
```

`seed_menu.sql` n'est volontairement pas appliqué sur `mirasia_test` : ce sont de vraies données de carte, pas des données de test. Sur Windows, penser à `chcp 65001` avant les commandes `psql -f` (voir note plus haut).

25 tests couvrent : authentification (accès refusé sans session, login valide/invalide, déconnexion), CRUD plats/cuisines, contraintes CHECK, création de stock, vente avec décrément correct du stock et traçage dans l'historique, refus d'une vente si stock insuffisant, dashboard, statistiques, refus de suppression d'une cuisine encore utilisée, ainsi que la carte du restaurant : catégories/variantes, carte publique filtrée sur les plats disponibles, tables (lecture publique/écriture staff), commande client (prix recalculé côté serveur, refus si plat indisponible), changement de statut et ajout d'articles à une commande, calcul automatique de la date des Jeudis Gourmands, et réservations (création publique, confirmation staff).

## Roadmap

- **V1** : stock, planning de préparation, dashboard *(fonctionnelle)*
- **V1.1** : contraintes d'intégrité, historique des mouvements (trigger), gestion d'erreurs centralisée, édition des plats *(fonctionnelle)*
- **V2** : authentification, module Ventes (fonction PL/pgSQL transactionnelle FIFO), statistiques, recherche/filtres, sécurité (helmet/rate-limit/logging), tests automatisés, Docker *(fonctionnelle)*
- **V3** : commande client (sur place / à emporter), écran cuisine, interface salle/serveur, réservations, back-office étendu pour la carte complète du restaurant *(fonctionnelle)*
  - Étape 1 : modèle de données + import de la carte réelle
  - Étape 2 : interface client de commande (public)
  - Étape 3 : écran cuisine
  - Étape 4 : interface salle/serveur
  - Étape 5 : back-office admin étendu (CRUD carte, dashboard ventes restaurant, export CSV)
- **V4 (plus tard)** : gestion multi-utilisateurs avec rôles, module de caisse complet, notifications automatiques (email) sur alerte de stock, temps réel (websockets) pour l'écran cuisine au lieu du polling

## Statut

✅ V2 fonctionnelle (stock, ventes, dashboard)
✅ V3 fonctionnelle (carte du restaurant, commande client, cuisine, salle, réservations, ventes restaurant) — testée en local (25 tests automatisés + tests manuels bout-en-bout), pas encore testée en conditions réelles au restaurant
✅ Démo en ligne déployée sur Render (web service Node.js, via `render.yaml`) connecté à une base PostgreSQL Supabase — base peuplée avec la vraie carte (`seed_menu.sql`), identifiants staff de démonstration (différents des identifiants réels du restaurant) :
- [Côté client — carte & commande](https://mirasia-gestion.onrender.com/commande.html)
- [Côté gestion — admin](https://mirasia-gestion.onrender.com/login.html) : identifiants de démonstration disponibles sur demande
