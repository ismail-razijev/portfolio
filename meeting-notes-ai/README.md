# Meeting Notes AI

Analyseur de comptes-rendus de réunion propulsé par l'IA. On colle une transcription brute, l'application génère un CR structuré (résumé, participants, décisions, actions à suivre) via l'API Claude.

🔗 **Démo en ligne** : [portfolio-7q2shyofrzputy8ltgnpmw.streamlit.app](https://portfolio-7q2shyofrzputy8ltgnpmw.streamlit.app) (protégée par un code d'accès, disponible sur demande)

## Pourquoi ce projet

Dans un rôle de chef de projet, la rédaction de CR est une tâche fréquente et chronophage. Ce projet automatise cette rédaction pour se concentrer sur l'essentiel : les décisions et le suivi des actions.

## Ce que ça fait

1. L'utilisateur colle ou uploade une transcription de réunion (texte brut)
2. L'application envoie ce texte à l'API Claude avec un prompt de structuration
3. Claude retourne un CR structuré : résumé, participants, points discutés, décisions, actions à suivre
4. Le résultat s'affiche et peut être téléchargé en Markdown

## Stack technique

- **Python**
- **API Anthropic (Claude)** pour l'analyse et la génération du CR
- **Streamlit** pour l'interface web

## Installation

```bash
git clone https://github.com/ismail-razijev/portfolio.git
cd portfolio/meeting-notes-ai
python -m venv venv
venv\Scripts\activate      # Windows
source venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
```

Crée un fichier `.env` à la racine du dossier (voir `.env.example`) avec ta clé API Anthropic :

```
ANTHROPIC_API_KEY=sk-ant-ta-cle-ici
```

## Utilisation

```bash
streamlit run app.py
```

L'application s'ouvre dans le navigateur sur `http://localhost:8501`. Colle une transcription (ou uploade un fichier `.txt`), clique sur **Analyser**, et télécharge le CR généré.

## Vérifications manuelles

Trois scripts de vérification (pas une suite de tests automatisés avec assertions, à lancer et relire le résultat à l'œil) :

- `test_api.py` : contrôle que la clé API Anthropic et la connexion fonctionnent
- `test_cr.py` : génère un CR sur une réunion type avec décisions et actions claires
- `test_cr_edge.py` : génère un CR sur deux cas limites (réunion sans décision formelle, transcription longue et désordonnée sans ponctuation) pour vérifier l'absence d'hallucination et la fidélité au contenu source

```bash
python test_api.py
python test_cr.py
python test_cr_edge.py
```

## Roadmap

- **V1** : transcription texte collée manuellement, CR généré par Claude *(fonctionnel)*
- **V2** : upload d'un fichier audio, transcription automatique (speech-to-text) avant analyse
- **V3** : écoute en direct de la réunion, CR généré sans aucune action manuelle

## Statut

✅ V1 fonctionnelle
