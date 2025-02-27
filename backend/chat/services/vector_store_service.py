import logging
from typing import List, Dict, Any
from langchain_ollama import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.schema import Document  # Add this import
from django.conf import settings
import chromadb
import shutil
import os
import time

logger = logging.getLogger(__name__)

class VectorStoreService:
    def __init__(self):
        # Initialize embeddings with minimal configuration
        self.embeddings = OllamaEmbeddings(
            base_url=settings.OLLAMA_HOST,
            model=settings.OLLAMA_MODEL
        )
        
        # Use ChromaDB HTTP client to connect to the server
        client = chromadb.HttpClient(
            host=settings.CHROMA_SETTINGS["chroma_server_host"],
            port=settings.CHROMA_SETTINGS["chroma_server_port"],
        )
        
        # Initialize vector store with HTTP client
        self.vector_store = Chroma(
            client=client,
            embedding_function=self.embeddings,
            collection_name="documents",
        )

    def add_documents(self, documents: List[Document]) -> None:
        """Add documents to the vector store with retries."""
        max_retries = 3
        retry_delay = 1
        
        for attempt in range(max_retries):
            try:
                # Add documents in smaller batches
                batch_size = 5
                for i in range(0, len(documents), batch_size):
                    batch = documents[i:i + batch_size]
                    self.vector_store.add_documents(
                        documents=batch,
                        ids=[f"{doc.metadata['chroma_id']}_{i}" for i, doc in enumerate(batch)]
                    )
                    logger.info(f"Added batch of {len(batch)} documents")
                return
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {str(e)}")
                if attempt == max_retries - 1:
                    raise
                time.sleep(retry_delay * (attempt + 1))

    def search_documents(self, query: str, k: int = 5) -> List[Document]:
        """Enhanced document search with topic filtering."""
        try:
            # Get all documents
            all_results = self.vector_store.get()
            
            # Create document collections
            header_docs = []
            content_docs = []
            
            # First pass: Organize documents
            for i, metadata in enumerate(all_results['metadatas']):
                doc = Document(
                    page_content=all_results['documents'][i],
                    metadata=metadata
                )
                
                # Headers get priority
                if metadata.get('chunk_id', 999) == 0:
                    header_docs.append(doc)
                else:
                    content_docs.append(doc)
            
            # Extract key topics from query
            topic_keywords = self._extract_topic_keywords(query)
            logger.info(f"Extracted topics from query: {topic_keywords}")
            
            # Score documents based on topic relevance
            topic_scores = {}
            for i, doc in enumerate(header_docs + content_docs):
                doc_id = id(doc)  # Use object id as dictionary key
                content = doc.page_content.lower()
                topic_scores[doc_id] = self._calculate_topic_relevance(content, topic_keywords)
            
            # Filter documents by minimum topic relevance
            min_relevance_threshold = 0.2
            relevant_docs = []
            for doc in header_docs + content_docs:
                if topic_scores[id(doc)] >= min_relevance_threshold:
                    relevant_docs.append((doc, topic_scores[id(doc)]))
            
            # Sort by relevance score
            relevant_docs.sort(key=lambda x: x[1], reverse=True)
            
            # Get final results
            results = [doc for doc, _ in relevant_docs[:k]]
            
            # Log results
            logger.info(f"Query: {query}")
            logger.info(f"Found {len(results)} relevant documents out of {len(header_docs + content_docs)}")
            
            return results[:k]
                
        except Exception as e:
            logger.error(f"Search error: {str(e)}")
            raise
        
    def _extract_topic_keywords(self, query: str) -> List[str]:
        """Extract main topic keywords from the query."""
        # Stopwords to remove
        stopwords = {'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'est', 'à', 
                    'en', 'que', 'qui', 'pour', 'dans', 'par', 'sur', 'au', 'aux', 'avec', 
                    'ce', 'ces', 'cette', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 
                    'elles', 'mon', 'ton', 'son', 'notre', 'votre', 'leur', 'comment', 
                    'où', 'quand', 'pourquoi', 'quoi', 'quel', 'quelle', 'the', 'a', 'is', 
                    'and', 'to', 'of', 'in', 'it', 'you', 'that', 'was', 'for', 'on', 'are', 
                    'with', 'as', 'have', 'be', 'at', 'this', 'but', 'by', 'from', 'what', 
                    'how', 'when', 'where', 'who', 'why', 'which'}
        
        # Split query into words, convert to lowercase, and remove stopwords
        words = query.lower().split()
        keywords = [word for word in words if word not in stopwords and len(word) > 2]
        
        # Return unique keywords
        return list(set(keywords))

    def _calculate_topic_relevance(self, content: str, topic_keywords: List[str]) -> float:
        """Calculate relevance score of content to topic keywords."""
        if not topic_keywords:
            return 0.0
            
        content_lower = content.lower()
        matches = sum(keyword in content_lower for keyword in topic_keywords)
        
        # Calculate score as percentage of matched keywords, with higher weight for multiple matches
        base_score = matches / len(topic_keywords)
        density_factor = min(1.0, matches / 5)  # Cap at 1.0 for 5+ matches
        
        # Combine base score with density factor
        return (base_score * 0.6) + (density_factor * 0.4)

    def delete_document(self, chroma_id: str) -> None:
        """Delete all chunks of a document from the vector store."""
        try:
            # Récupérer tous les documents
            results = self.vector_store.get()
            
            # Trouver les IDs des chunks à supprimer
            ids_to_delete = []
            for i, metadata in enumerate(results['metadatas']):
                if metadata.get('chroma_id') == chroma_id:
                    ids_to_delete.append(results['ids'][i])
            
            if ids_to_delete:
                # Supprimer les chunks
                self.vector_store._collection.delete(
                    ids=ids_to_delete
                )
                logger.info(f"Deleted {len(ids_to_delete)} chunks for document with chroma_id {chroma_id}")
            else:
                logger.warning(f"No chunks found for document with chroma_id {chroma_id}")
                
        except Exception as e:
            logger.error(f"Error deleting document: {str(e)}")
            raise