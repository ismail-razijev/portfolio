# Meeting Notes AI

Analyseur de comptes-rendus de réunion propulsé par l'IA. On colle une transcription brute, l'application génère un CR structuré (résumé, participants, décisions, actions à suivre) via l'API Claude.

## Pourquoi ce projet

Dans un rôle de chef de projet, la rédaction de CR est une tâche fréquente et chronophage. Ce projet automatise cette rédaction pour se concentrer sur l'essentiel : les décisions et le suivi des actions.

## Ce que ça fait

1. L'utilisateur colle ou uploade une transcription de réunion (texte brut)
2. L'application envoie ce texte à l'API Claude avec un prompt de structuration
3. Claude retourne un CR structuré : résumé, participants, points discutés, décisions, actions à suivre
4. Le résultat s'affiche et peut être téléchargé (Markdown ou PDF)

## Stack technique

- **Python**
- **API Anthropic (Claude)** pour l'analyse et la génération du CR
- **Streamlit** pour l'interface web

## Roadmap

- **V1** : transcription texte collée manuellement, CR généré par Claude *(en cours)*
- **V2** : upload d'un fichier audio, transcription automatique (speech-to-text) avant analyse
- **V3** : écoute en direct de la réunion, CR généré sans aucune action manuelle

## Statut

🚧 En développement
