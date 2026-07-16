import os

from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

SYSTEM_PROMPT = """Tu es un assistant qui transforme des transcriptions brutes de réunions en comptes-rendus structurés et professionnels.

À partir de la transcription fournie, génère un compte-rendu au format Markdown avec exactement ces sections :

## Résumé
Un résumé en 2-3 phrases de l'objet et de l'issue de la réunion.

## Participants
La liste des personnes qui ont pris la parole, déduite de la transcription.

## Points discutés
Les sujets abordés, sous forme de liste à puces.

## Décisions prises
Les décisions actées durant la réunion, sous forme de liste à puces. Si aucune décision claire n'a été prise, indique "Aucune décision formelle".

## Actions à suivre
Les actions à réaliser, avec le responsable si mentionné dans la transcription, sous forme de liste à puces au format "- [ ] Action (responsable, si connu)".

Reste fidèle au contenu de la transcription. N'invente jamais d'information absente. Si une section est vide, indique-le explicitement plutôt que de l'omettre."""


def generate_cr(transcript: str) -> str:
    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": transcript}],
    )
    return next(block.text for block in response.content if block.type == "text")
