import logging
from typing import Dict, List
from langchain.schema import Document
from langchain.chains import ConversationalRetrievalChain
from langchain_community.llms import Ollama
from .vector_store_service import VectorStoreService

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self, vector_store_service: VectorStoreService):
        self.vector_store_service = vector_store_service
        self.llm = Ollama(model="llama3.1:8b")
        self.chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.vector_store_service.vector_store.as_retriever(),
            return_source_documents=True
        )

    def generate_response(self, query: str, chat_history: List = []) -> Dict:
        """Generate response using RAG with conversation history."""
        try:
            result = self.chain({"question": query, "chat_history": chat_history})
            
            sources = list(set(
                doc.metadata.get('filename', 'Unknown')
                for doc in result.get('source_documents', [])
            ))

            return {
                "response": result["answer"],
                "sources": sources
            }
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            raise