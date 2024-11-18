import logging
from typing import List, Dict, Any
from langchain.schema import Document
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from django.conf import settings
import chromadb
from chromadb.config import Settings
import shutil
import os

logger = logging.getLogger(__name__)

class VectorStoreService:
    def __init__(self):
        self.embeddings = FastEmbedEmbeddings()
        
        # Initialize vector store with existing database if it exists
        persist_dir = settings.CHROMA_SETTINGS["persist_directory"]
        self.vector_store = Chroma(
            persist_directory=persist_dir,
            embedding_function=self.embeddings,
            collection_name="documents"
        )
        
        collection_size = len(self.vector_store.get()['ids'])
        logger.info(f"Initialized Chroma database with {collection_size} existing documents")

    def add_documents(self, documents: List[Document]) -> None:
        """Add documents to the vector store."""
        try:
            # Add documents
            self.vector_store.add_documents(documents)
            self.vector_store.persist()
            
            # Verify size after addition
            collection_size = len(self.vector_store.get()['ids'])
            logger.info(f"Vector store now contains {collection_size} documents")
            
        except Exception as e:
            logger.error(f"Error adding documents to vector store: {str(e)}")
            raise

    def search_documents(self, query: str, k: int = 6) -> List[Document]:
        """Search for relevant documents based on query."""
        try:
            # Vérifier que la collection n'est pas vide
            collection_size = len(self.vector_store.get()['ids'])
            if collection_size == 0:
                logger.warning("Vector store is empty!")
                return []
                
            logger.info(f"Searching in {collection_size} documents")
            
            # Rechercher les documents
            results = self.vector_store.similarity_search(query, k=k)
            
            # Log les résultats
            logger.info(f"Found {len(results)} relevant documents")
            for doc in results:
                logger.info(f"Found document: {doc.metadata.get('filename')} - Content preview: {doc.page_content[:100]}...")
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching documents: {str(e)}")
            raise

    def delete_document(self, chroma_id: str) -> None:
        """Delete all chunks of a document from the vector store."""
        try:
            # Utiliser where pour trouver tous les chunks associés au chroma_id
            self.vector_store._collection.delete(
                where={"chroma_id": chroma_id}
            )
        except Exception as e:
            logger.error(f"Error deleting document: {str(e)}")
            raise