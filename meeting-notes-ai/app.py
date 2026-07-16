import anthropic
import streamlit as st

from cr_analyzer import generate_cr

st.set_page_config(page_title="Meeting Notes AI", page_icon="📝")

st.title("📝 Meeting Notes AI")
st.caption("Colle la transcription d'une réunion, l'IA génère le compte-rendu structuré.")

uploaded_file = st.file_uploader("Ou uploade un fichier .txt", type=["txt"])
uploaded_text = uploaded_file.read().decode("utf-8") if uploaded_file else ""

transcript = st.text_area(
    "Transcription de la réunion",
    value=uploaded_text,
    height=300,
    placeholder="Colle ici la transcription brute...",
)

if st.button("Analyser", type="primary"):
    if not transcript.strip():
        st.warning("Colle une transcription ou uploade un fichier avant de lancer l'analyse.")
    else:
        try:
            with st.spinner("Génération du compte-rendu..."):
                cr = generate_cr(transcript)
        except anthropic.AuthenticationError:
            st.error("Clé API invalide ou manquante. Vérifie le fichier .env.")
        except anthropic.RateLimitError:
            st.error("Limite de requêtes atteinte, réessaie dans quelques instants.")
        except anthropic.APIConnectionError:
            st.error("Impossible de contacter l'API Claude, vérifie ta connexion internet.")
        except anthropic.APIStatusError as e:
            st.error(f"Erreur de l'API Claude : {e.message}")
        else:
            st.markdown(cr)
            st.download_button(
                "Télécharger le CR (Markdown)",
                data=cr,
                file_name="compte-rendu.md",
                mime="text/markdown",
            )
