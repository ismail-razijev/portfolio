import os

from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

response = client.messages.create(
    model="claude-sonnet-5",
    max_tokens=200,
    messages=[{"role": "user", "content": "Réponds juste par : la connexion fonctionne."}],
)

for block in response.content:
    if block.type == "text":
        print(block.text)
