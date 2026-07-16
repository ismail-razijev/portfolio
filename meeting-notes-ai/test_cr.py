from cr_analyzer import generate_cr

TRANSCRIPT_EXEMPLE = """
Marie : Bonjour à tous, on démarre le point hebdo sur le projet site vitrine.
Julien : Salut, j'ai fini la maquette de la page d'accueil, je l'envoie aujourd'hui à Marie pour validation.
Marie : Parfait, je te fais un retour d'ici jeudi.
Sophie : De mon côté le formulaire de contact a un bug sur mobile, je regarde ça cette semaine.
Julien : On avait aussi parlé d'ajouter une section témoignages clients.
Marie : Oui, on le garde pour la v2, priorité au lancement pour l'instant.
Sophie : D'accord. Est-ce qu'on fixe une date de lancement ?
Marie : On vise le 15 du mois prochain, je confirme avec le client cette semaine.
Julien : Ok pour moi.
"""

if __name__ == "__main__":
    print(generate_cr(TRANSCRIPT_EXEMPLE))
