# Mirasia Gestion

Application de gestion pour le restaurant Mirasia (Verviers) : suivi du stock des plats surgelés, planning de préparation, et dashboard de synthèse.

## Pourquoi ce projet

Mirasia propose une cuisine d'Asie centrale et du Caucase, avec des plats préparés à l'avance et stockés surgelés (manti, plats ouïghours, kazakhs, etc.). Ce projet remplace un suivi manuel par un vrai outil : savoir en un coup d'œil quel stock est bas, et ce qui doit être préparé.

C'est aussi un projet portfolio pensé pour réutiliser des compétences en base de données relationnelle (modélisation, clés primaires/étrangères) vues en cours de PL/pgSQL, appliquées à un cas réel.

## Ce que ça fait

- **Gestion des cuisines et des plats** : créer/activer/désactiver des plats, les rattacher à une cuisine
- **Suivi du stock** : quantité disponible par plat, seuil d'alerte, dates de préparation/péremption
- **Planning de préparation** : quoi préparer, quelle quantité, pour quand, avec un statut (prévue / en cours / terminée)
- **Dashboard** : vue d'ensemble (plats actifs, alertes de stock, préparations en attente), stock sous le seuil d'alerte, préparations prévues du jour

## Stack technique

- **Node.js + Express** : serveur et API REST
- **PostgreSQL** : base de données relationnelle
- **HTML / CSS / JavaScript** (vanilla, sans framework) : interface web

## Structure du projet

```
mirasia-gestion/
├── src/
│   ├── index.js           # Point d'entrée : serveur Express, montage des routes
│   ├── db/
│   │   ├── pool.js        # Connexion PostgreSQL
│   │   └── schema.sql     # Schéma des tables (cuisines, plats, stock, preparations)
│   └── routes/
│       ├── cuisines.js    # CRUD cuisines
│       ├── plats.js       # CRUD plats
│       ├── stock.js       # CRUD stock
│       ├── preparations.js # CRUD planning de préparation
│       └── dashboard.js   # Statistiques agrégées
└── public/                 # Frontend (servi statiquement par Express)
    ├── index.html          # Dashboard
    ├── plats.html          # Gestion des plats & cuisines
    ├── stock.html          # Gestion du stock
    ├── preparations.html   # Planning de préparation
    └── style.css
```

## Modèle de données

```
cuisines (id, nom)
plats (id, nom, id_cuisine → cuisines, prix, actif)
stock (id, id_plat → plats, quantite, seuil_alerte, date_preparation, date_peremption)
preparations (id, id_plat → plats, quantite_prevue, date_prevue, statut)
```

## Installation

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
```

Créer un fichier `.env` à la racine du dossier (voir `.env.example`) :

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mirasia
DB_USER=postgres
DB_PASSWORD=ton-mot-de-passe-postgres
PORT=3000
```

## Utilisation

```bash
npm start
```

L'application est accessible sur `http://localhost:3000`.

## Roadmap

- **V1** : stock, planning de préparation, dashboard *(fonctionnelle)*
- **V2** : trigger PL/pgSQL pour générer automatiquement une alerte quand le stock passe sous le seuil, gestion multi-utilisateurs (toi + employés)
- **V3** : réservations, module de caisse

## Statut

✅ V1 fonctionnelle
