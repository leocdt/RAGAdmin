import logging
from typing import List, Dict, Any
from langchain.schema import Document
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings

logger = logging.getLogger(__name__)

class VectorStoreService:
    def __init__(self):
        self.embeddings = OllamaEmbeddings(model="llama2")
        self.vector_store = Chroma(
            persist_directory="./chroma_db",
            embedding_function=self.embeddings
        )

    def add_documents(self, documents: List[Document]) -> None:
        """Add documents to the vector store."""
        try:
            self.vector_store.add_documents(documents)
        except Exception as e:
            logger.error(f"Error adding documents to vector store: {str(e)}")
            raise

    def search_documents(self, query: str, k: int = 3) -> List[Document]:
        """Search for relevant documents based on query."""
        try:
            return self.vector_store.similarity_search(query, k=k)
        except Exception as e:
            logger.error(f"Error searching documents: {str(e)}")
            raise

    def delete_document(self, document_id: str) -> None:
        """Delete a document from the vector store."""
        try:
            self.vector_store.delete(ids=[document_id])
        except Exception as e:
            logger.error(f"Error deleting document: {str(e)}")
            raise