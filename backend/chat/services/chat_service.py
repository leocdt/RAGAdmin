from langchain_community.llms import Ollama
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain.prompts import PromptTemplate
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains.history_aware_retriever import create_history_aware_retriever
from django.conf import settings
import logging
from sentence_transformers import SentenceTransformer
from datetime import datetime
from zoneinfo import ZoneInfo
from langchain.chains.llm import LLMChain

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self, vector_store_service, model_name="llama2"):
        self.vector_store_service = vector_store_service
        self.chat_histories = {}  # Dictionary to store histories for each chat ID
        self.model_name = model_name
        self.llm = Ollama(model=self.model_name)
        
        # Initialiser l'encoder une seule fois
        self.encoder = SentenceTransformer("paraphrase-mpnet-base-v2")
        
        # Définir la fonction d'embedding personnalisée
        self.embedding_function = lambda texts: self.encoder.encode(texts).tolist()
        
        # Configurer ChromaDB avec la fonction d'embedding personnalisée
        self.vector_store = Chroma(
            collection_name="documents",
            embedding_function=self.embedding_function
        )
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=4096,
            chunk_overlap=20,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
            is_separator_regex=False
        )

    
    def generate_response(self, query: str, chat_id: str, history: list = None, model: str = None, use_context: bool = True):
        try:
            # Mise à jour du modèle si spécifié
            if model and model != self.model_name:
                self.model_name = model
                self.llm = Ollama(model=self.model_name)
            
            # Initialisation de l'historique du chat
            if chat_id not in self.chat_histories:
                self.chat_histories[chat_id] = []
            
            # Formatage de l'historique du chat
            formatted_history = ""
            if history:
                self.chat_histories[chat_id] = []  # Réinitialisation de l'historique
                formatted_messages = []
                for msg in history:
                    role = msg.get('role', '')
                    content = msg.get('content', '')
                    if role == 'human':
                        self.chat_histories[chat_id].append({"role": "human", "content": content})
                        formatted_messages.append(f"Human: {content}")
                    elif role in ['assistant', 'ai']:
                        self.chat_histories[chat_id].append({"role": "assistant", "content": content})
                        formatted_messages.append(f"Assistant: {content}")
                formatted_history = "\n".join(formatted_messages)
            
            print(f"\n=== Chat History ===")
            print(formatted_history)
            
            print(f"\n=== Context Check ===")
            print(f"Query: {query}")
            print(f"Using context: {use_context}")
            
            if use_context:
                # Recherche purement basée sur la similarité
                results = self.vector_store_service.search_documents(query, k=10)
                
                # Formatage du contexte et affichage pour le debug
                formatted_context = self._format_context(results)
                print("\n=== CONTEXTE UTILISÉ ===")
                print(formatted_context)
                logger.info("\n=== CONTEXTE UTILISÉ ===")
                logger.info(formatted_context)
                
                # Définition du prompt avec instructions claires
                document_prompt = PromptTemplate.from_template(
                    """
                    Vous êtes RAGAdmin, un assistant technique spécialisé dans AWX. Vous devez répondre uniquement en vous basant sur le contexte fourni ci-dessous.

                    Contexte issu des documents :
                    {context}

                    Historique de la conversation :
                    {chat_history}

                    Question : {input}

                    IMPORTANT :
                    - Parcourez attentivement tout le contexte fourni.
                    - Identifiez la section intitulée "Login as a Superuser" et extrayez l'URL du serveur (par exemple, une adresse du type https://168.125.250.30).
                    - Indiquez la procédure pour se connecter en tant que super utilisateur dans AWX, en précisant le login par défaut et l'adresse IP du serveur.
                    - Si ces informations ne sont pas présentes dans le contexte, mentionnez-le explicitement.

                    Réponse :
                    """
                )

                
                document_chain = LLMChain(llm=self.llm, prompt=document_prompt)
                response = document_chain.invoke({
                    "input": query,
                    "chat_history": formatted_history,
                    "chat_id": chat_id,
                    "current_date": datetime.now(ZoneInfo("UTC")).strftime("%Y-%m-%d %H:%M:%S UTC"),
                    "context": formatted_context
                })
                
                if isinstance(response, dict):
                    answer = response.get("text", response.get("answer", ""))
                else:
                    answer = str(response)


            else:
                # Réponse générée sans contexte (fallback LLM direct)
                direct_prompt = PromptTemplate.from_template(
                    """
                    Vous êtes RAGAdmin, un assistant technique.
                    
                    Historique de la conversation :
                    {chat_history}
                    
                    Question : {input}
                    
                    Répondez de manière claire et concise en utilisant vos connaissances générales.
                    """
                )

                answer = self.llm.invoke(direct_prompt.format(
                    chat_id=chat_id,
                    current_date=datetime.now(ZoneInfo("UTC")).strftime("%Y-%m-%d %H:%M:%S UTC"),
                    chat_history=formatted_history,
                    input=query
                ))

            # Mise à jour de l'historique du chat
            self.chat_histories[chat_id].append({"role": "human", "content": query})
            self.chat_histories[chat_id].append({"role": "assistant", "content": answer})

            return answer  # **On ne renvoie que la réponse propre**

        except Exception as e:
            print(f"\n=== Error ===")
            print(f"Error generating response: {str(e)}")
            logger.error(f"Error generating response in chat {chat_id}: {str(e)}")
            raise

    def _format_context(self, documents):
        """Format documents into a clean string for LLM context processing."""
        formatted_context = ""
        for i, doc in enumerate(documents):
            formatted_context += f"\n-------- DOCUMENT {i+1} --------\n"
            if doc.metadata.get('filename'):
                formatted_context += f"Source: {doc.metadata['filename']}\n\n"
            formatted_context += doc.page_content + "\n\n"
        
        return formatted_context.strip()
