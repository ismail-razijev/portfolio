from cr_analyzer import generate_cr

TRANSCRIPT_SANS_DECISION = """
Thomas : On fait un point rapide sur le budget marketing du trimestre.
Elena : J'ai regardé les chiffres, on est à peu près dans les clous mais ça dépend des dépenses de septembre.
Thomas : Ok, on n'a pas encore les chiffres définitifs alors.
Elena : Non, il faut attendre la clôture comptable.
Thomas : On se recale la semaine prochaine du coup, rien à trancher aujourd'hui.
Elena : Ok pour moi.
"""

TRANSCRIPT_LONGUE_DESORDONNEE = """
bon alors euh on commence, tout le monde est là ?
oui oui
ok donc pour le sprint qui vient, karim tu peux reprendre le ticket de la page login ?
karim : ouais pas de souci je m'y mets demain matin
et sarah le design du dashboard c'est prêt ?
sarah : presque, il me manque juste les retours de nadia sur les couleurs
nadia : je lui envoie ça ce soir promis
ok cool, et niveau deadline on est toujours sur vendredi prochain ?
karim : ça devrait aller oui
sarah : oui de mon côté aussi
parfait, on se revoit mercredi pour un point d'avancement
ok
ok à mercredi
"""

if __name__ == "__main__":
    print("=== Cas 1 : réunion sans décision formelle ===\n")
    print(generate_cr(TRANSCRIPT_SANS_DECISION))
    print("\n\n=== Cas 2 : transcription longue, désordonnée, sans ponctuation soignée ===\n")
    print(generate_cr(TRANSCRIPT_LONGUE_DESORDONNEE))
