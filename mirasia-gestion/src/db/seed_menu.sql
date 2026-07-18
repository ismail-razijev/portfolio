-- Import de la carte complète du restaurant Mirasia.
--
-- Fichier de données, séparé du schéma (migration_v1_3.sql). Étape manuelle,
-- volontairement PAS montée dans docker-compose.yml ni utilisée par les tests
-- (mirasia_test ne doit pas contenir de vraies données de carte).
--
-- Prérequis : schema.sql + migration_v1_1.sql + migration_v1_2.sql + migration_v1_3.sql
-- déjà appliqués.
--
--   psql -U postgres -d mirasia -f src/db/seed_menu.sql

-- ============================================================
-- Catégories
-- ============================================================
INSERT INTO categories (nom, ordre_affichage) VALUES
    ('Soupes froides', 1),
    ('Soupes', 2),
    ('Salades', 3),
    ('Spécialités boulangères', 4),
    ('Plats chauds', 5),
    ('Desserts', 6),
    ('Boissons softs', 7),
    ('Boissons chaudes', 8);

-- ============================================================
-- Soupes froides
-- ============================================================
INSERT INTO plats (nom, id_categorie, description, vegetarien, prix) VALUES
    ('Okroshka', (SELECT id FROM categories WHERE nom = 'Soupes froides'),
     'Soupe froide rafraîchissante, légumes croquants, herbes, œufs et viande dans une base de yaourt',
     'non', 9.50);

-- ============================================================
-- Soupes
-- ============================================================
INSERT INTO plats (nom, id_categorie, description, vegetarien, prix) VALUES
    ('Bouillon de poulet', (SELECT id FROM categories WHERE nom = 'Soupes'),
     'Bouillon de poulet clair avec nouilles maison', 'option', 7.50),
    ('Borsh', (SELECT id FROM categories WHERE nom = 'Soupes'),
     'Soupe aigre-épicée aux viandes et épices', 'non', 8.50),
    ('Myampar', (SELECT id FROM categories WHERE nom = 'Soupes'),
     'Soupe traditionnelle ouïghoure à base de pâte maison et viande', 'option', 8.50),
    ('Tom Yam', (SELECT id FROM categories WHERE nom = 'Soupes'),
     'Soupe épicée et aromatique aux fruits de mer', 'non', 9.50),
    ('Soupe de lentilles', (SELECT id FROM categories WHERE nom = 'Soupes'),
     'Végétarienne, onctueuse', 'oui', 7.50),
    ('Pelmeni en bouillon', (SELECT id FROM categories WHERE nom = 'Soupes'),
     'Raviolis traditionnels à la viande, servis dans un bouillon chaud', 'non', 8.50);

-- ============================================================
-- Salades
-- ============================================================
INSERT INTO plats (nom, id_categorie, description, vegetarien, prix) VALUES
    ('Olivier', (SELECT id FROM categories WHERE nom = 'Salades'),
     'Salade traditionnelle légumes, pommes de terre, œufs et poulet', 'option', 9.50),
    ('Funchoza', (SELECT id FROM categories WHERE nom = 'Salades'),
     'Vermicelles de soja, légumes et poulet', 'option', 12.50),
    ('César', (SELECT id FROM categories WHERE nom = 'Salades'),
     'Salade verte, croûtons, fromage et poulet', 'non', 12.00),
    ('Salade d''aubergines', (SELECT id FROM categories WHERE nom = 'Salades'),
     'Aubergines assaisonnées, herbes, épices, viande', 'option', 12.50),
    ('Salade aux épinards', (SELECT id FROM categories WHERE nom = 'Salades'),
     'Épinards frais, légumes du jour et poulet', 'option', 11.50),
    ('Achuchuk', (SELECT id FROM categories WHERE nom = 'Salades'),
     'Salade fraîche tomates et oignons', 'oui', 5.50),
    ('Gribnoi', (SELECT id FROM categories WHERE nom = 'Salades'),
     'Champignons assaisonnés avec viande ou poulet', 'option', 11.50),
    ('Markovnyi', (SELECT id FROM categories WHERE nom = 'Salades'),
     'Carottes râpées aux épices douces', 'oui', 6.50),
    ('Salade de chou', (SELECT id FROM categories WHERE nom = 'Salades'),
     'Chou frais assaisonné', 'oui', 7.00),
    ('Aubergines croquantes', (SELECT id FROM categories WHERE nom = 'Salades'),
     'Aubergines frites', 'oui', 7.50);

-- ============================================================
-- Spécialités boulangères
-- ============================================================
INSERT INTO plats (nom, id_categorie, description, vegetarien, prix, unite) VALUES
    ('Chebureki', (SELECT id FROM categories WHERE nom = 'Spécialités boulangères'),
     'Chausson croustillant farci à la viande, frit à la minute', 'non', 3.50, 'piece'),
    ('Samsa', (SELECT id FROM categories WHERE nom = 'Spécialités boulangères'),
     'Feuilleté traditionnel cuit au four, farci à la viande', 'non', 3.50, 'piece');

INSERT INTO plats (nom, id_categorie, description, vegetarien, prix) VALUES
    ('Chepalgsh', (SELECT id FROM categories WHERE nom = 'Spécialités boulangères'),
     'Pain moelleux tchétchène, farci au fromage et oignons verts', 'oui', 5.50),
    ('Hingalsh', (SELECT id FROM categories WHERE nom = 'Spécialités boulangères'),
     'Pain moelleux farci à la purée de potiron', 'oui', 6.00),
    ('Lepechki (pain maison)', (SELECT id FROM categories WHERE nom = 'Spécialités boulangères'),
     'Pain maison', 'oui', 2.80);

-- ============================================================
-- Plats chauds
-- ============================================================

-- Plats à prix unique (pas de variante poulet/bœuf)
INSERT INTO plats (nom, id_categorie, description, vegetarien, prix) VALUES
    ('Plov (Al Bukhari)', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
     'Riz mijoté aux épices, légumes et viande', 'non', 16.50),
    ('Lagman maison', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
     'Nouilles maison, légumes et viande dans une sauce parfumée', 'non', 16.50),
    ('Guyru Ganfan', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
     'Riz, sauce onctueuse, bœuf et poivrons', 'option', 18.50),
    ('Ganfan au poulet', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
     'Riz, poulet et légumes sautés', 'option', 17.50),
    ('Manty Uyghur', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
     'Grands raviolis vapeur farcis au bœuf', 'non', 16.00),
    ('Manty Mirasia', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
     'Raviolis vapeur farcis au bœuf et potiron', 'non', 16.50),
    ('Manty frit', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
     'Manty frits croustillants', 'non', 17.00);

-- Plats à variantes poulet/bœuf (une ligne plats + plusieurs lignes variantes,
-- via WITH ... RETURNING pour récupérer l'id généré dans le même script).
WITH p AS (
    INSERT INTO plats (nom, id_categorie, description, vegetarien)
    VALUES ('Kazan kebab', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
            'Viande avec oignons, cuite au kazan traditionnel', 'non')
    RETURNING id
)
INSERT INTO variantes (id_plat, nom, prix)
SELECT id, 'Bœuf', 22.50 FROM p
UNION ALL SELECT id, 'Poulet', 21.50 FROM p;

WITH p AS (
    INSERT INTO plats (nom, id_categorie, description, vegetarien)
    VALUES ('Guyru Lagman', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
            'Nouilles artisanales, sauce onctueuse, poivrons', 'option')
    RETURNING id
)
INSERT INTO variantes (id_plat, nom, prix)
SELECT id, 'Poulet', 17.50 FROM p
UNION ALL SELECT id, 'Bœuf', 18.50 FROM p;

WITH p AS (
    INSERT INTO plats (nom, id_categorie, description, vegetarien)
    VALUES ('Guyru Lagman avec œufs', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
            'Nouilles artisanales, sauce onctueuse, poivrons, œufs', 'option')
    RETURNING id
)
INSERT INTO variantes (id_plat, nom, prix)
SELECT id, 'Poulet', 18.00 FROM p
UNION ALL SELECT id, 'Bœuf', 19.00 FROM p;

WITH p AS (
    INSERT INTO plats (nom, id_categorie, description, vegetarien)
    VALUES ('Mirasia Lagman avec ail d''ours', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
            'Nouilles maison, ail d''ours', 'option')
    RETURNING id
)
INSERT INTO variantes (id_plat, nom, prix)
SELECT id, 'Poulet', 18.00 FROM p
UNION ALL SELECT id, 'Bœuf', 19.00 FROM p;

WITH p AS (
    INSERT INTO plats (nom, id_categorie, description, vegetarien)
    VALUES ('Tsoumyan Lagman', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
            'Nouilles étirées à la main, bœuf mijoté aux légumes et épices ouïghoures', 'option')
    RETURNING id
)
INSERT INTO variantes (id_plat, nom, prix)
SELECT id, 'Poulet', 17.50 FROM p
UNION ALL SELECT id, 'Bœuf', 18.50 FROM p;

WITH p AS (
    INSERT INTO plats (nom, id_categorie, description, vegetarien)
    VALUES ('Bestroganov', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
            'Bœuf/poulet aux champignons, sauce crémeuse, riz blanc', 'non')
    RETURNING id
)
INSERT INTO variantes (id_plat, nom, prix)
SELECT id, 'Poulet', 17.50 FROM p
UNION ALL SELECT id, 'Bœuf', 18.50 FROM p;

WITH p AS (
    INSERT INTO plats (nom, id_categorie, description, vegetarien)
    VALUES ('Jiji Galnysh', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
            'Pâtes traditionnelles tchétchènes, bœuf et sauce à l''ail', 'non')
    RETURNING id
)
INSERT INTO variantes (id_plat, nom, prix)
SELECT id, 'Bœuf', 21.50 FROM p
UNION ALL SELECT id, 'Poulet', 20.50 FROM p;

WITH p AS (
    INSERT INTO plats (nom, id_categorie, description, vegetarien)
    VALUES ('Wok', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
            'Nouilles sautées, épices, légumes et viande', 'option')
    RETURNING id
)
INSERT INTO variantes (id_plat, nom, prix)
SELECT id, 'Bœuf', 18.50 FROM p
UNION ALL SELECT id, 'Poulet', 17.50 FROM p;

WITH p AS (
    INSERT INTO plats (nom, id_categorie, description, vegetarien)
    VALUES ('Frites & viandes sautées', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
            'Frites et viande sautée', 'option')
    RETURNING id
)
INSERT INTO variantes (id_plat, nom, prix)
SELECT id, 'Poulet', 17.50 FROM p
UNION ALL SELECT id, 'Bœuf', 18.50 FROM p;

-- Jeudis Gourmands : exclusivement sur commande, voir fn_creer_commande_client
-- pour la règle "avant mercredi 22h00 pour le jeudi suivant".
INSERT INTO plats (nom, id_categorie, description, vegetarien, prix, sur_commande) VALUES
    ('Beshparmak pour 4 personnes', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
     'Plat national kazakh, viande bouillie cheval marinée et bœuf sur larges nouilles plates, bouillon parfumé et oignons',
     'non', 92.00, true),
    ('Hinkali Géorgien', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
     'Raviolis géorgiens farcis d''une viande épicée, bouillon savoureux',
     'non', 15.50, true),
    ('Hachapuri à la Adjarski Géorgien', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
     'Pain traditionnel en barque, fromages fondus, œuf coulant, noisette de beurre',
     'oui', 14.00, true),
    ('Mantis à pâte levée au jusai', (SELECT id FROM categories WHERE nom = 'Plats chauds'),
     'Raviolis vapeur pâte briochée, farcis à l''ail d''ours',
     'non', 17.50, true);

-- ============================================================
-- Desserts
-- ============================================================
INSERT INTO plats (nom, id_categorie, description, vegetarien, prix) VALUES
    ('Napoléon', (SELECT id FROM categories WHERE nom = 'Desserts'), NULL, 'oui', 6.00),
    ('Barhatnyi (red velvet)', (SELECT id FROM categories WHERE nom = 'Desserts'), NULL, 'oui', 7.00),
    ('Pistache', (SELECT id FROM categories WHERE nom = 'Desserts'), NULL, 'oui', 7.00),
    ('Medovik', (SELECT id FROM categories WHERE nom = 'Desserts'), NULL, 'oui', 6.00),
    ('Gâteau du jour', (SELECT id FROM categories WHERE nom = 'Desserts'),
     'Prix variable selon disponibilité', 'oui', NULL);

-- ============================================================
-- Boissons softs
-- ============================================================
INSERT INTO plats (nom, id_categorie, description, vegetarien, prix) VALUES
    ('Spa plate 1L', (SELECT id FROM categories WHERE nom = 'Boissons softs'), NULL, 'oui', 6.50),
    ('Spa pétillante 1L', (SELECT id FROM categories WHERE nom = 'Boissons softs'), NULL, 'oui', 6.50),
    ('Spa plate 25cl', (SELECT id FROM categories WHERE nom = 'Boissons softs'), NULL, 'oui', 2.50),
    ('Spa pétillante 25cl', (SELECT id FROM categories WHERE nom = 'Boissons softs'), NULL, 'oui', 2.50),
    ('Natakhtare poire 0,5L', (SELECT id FROM categories WHERE nom = 'Boissons softs'), NULL, 'oui', 4.50),
    ('Natakhtare raisin 0,5L', (SELECT id FROM categories WHERE nom = 'Boissons softs'), NULL, 'oui', 4.50);

-- Pales 33cl : même prix, plusieurs parfums au choix -> variantes
WITH p AS (
    INSERT INTO plats (nom, id_categorie, description, vegetarien)
    VALUES ('Pales 33cl', (SELECT id FROM categories WHERE nom = 'Boissons softs'),
            'Canette 33cl, plusieurs parfums au choix', 'oui')
    RETURNING id
)
INSERT INTO variantes (id_plat, nom, prix)
SELECT id, v.nom, 3.50 FROM p, (VALUES
    ('Coca'), ('Coca zéro'), ('Pêche violette blanche'),
    ('Mojito myrtille fraise'), ('Orange grenadine framboise')
) AS v(nom);

-- Spa plate fruité : même prix, plusieurs parfums au choix -> variantes
WITH p AS (
    INSERT INTO plats (nom, id_categorie, description, vegetarien)
    VALUES ('Spa plate fruité', (SELECT id FROM categories WHERE nom = 'Boissons softs'),
            'Eau plate aromatisée, plusieurs parfums au choix', 'oui')
    RETURNING id
)
INSERT INTO variantes (id_plat, nom, prix)
SELECT id, v.nom, 4.50 FROM p, (VALUES
    ('Framboise myrtille'), ('Mangue abricot'), ('Pastèque fraise')
) AS v(nom);

-- ============================================================
-- Boissons chaudes
-- ============================================================
INSERT INTO plats (nom, id_categorie, description, vegetarien, prix) VALUES
    ('Café', (SELECT id FROM categories WHERE nom = 'Boissons chaudes'), NULL, 'oui', 3.50),
    ('Cappuccino', (SELECT id FROM categories WHERE nom = 'Boissons chaudes'), NULL, 'oui', 4.50),
    ('Atken chai', (SELECT id FROM categories WHERE nom = 'Boissons chaudes'), NULL, 'oui', 5.00);

WITH p AS (
    INSERT INTO plats (nom, id_categorie, description, vegetarien)
    VALUES ('Latte', (SELECT id FROM categories WHERE nom = 'Boissons chaudes'),
            'Plusieurs parfums au choix', 'oui')
    RETURNING id
)
INSERT INTO variantes (id_plat, nom, prix)
SELECT id, v.nom, 4.50 FROM p, (VALUES
    ('Caramel'), ('Vanille'), ('Noisette')
) AS v(nom);

WITH p AS (
    INSERT INTO plats (nom, id_categorie, description, vegetarien)
    VALUES ('Thé maison', (SELECT id FROM categories WHERE nom = 'Boissons chaudes'),
            'Plusieurs parfums au choix', 'oui')
    RETURNING id
)
INSERT INTO variantes (id_plat, nom, prix)
SELECT id, v.nom, 6.50 FROM p, (VALUES
    ('Tropical (passion & mangue)'),
    ('Exotic (ananas & pêche)'),
    ('Fruits des bois (blueberry & violette)')
) AS v(nom);

WITH p AS (
    INSERT INTO plats (nom, id_categorie, description, vegetarien)
    VALUES ('Thé maison premium', (SELECT id FROM categories WHERE nom = 'Boissons chaudes'),
            'Plusieurs parfums au choix', 'oui')
    RETURNING id
)
INSERT INTO variantes (id_plat, nom, prix)
SELECT id, v.nom, 7.50 FROM p, (VALUES
    ('Marakanski (fruits rouges/mangue/citron & orange)'),
    ('Tashkensi navat (miel/citron/orange & mangue)')
) AS v(nom);
