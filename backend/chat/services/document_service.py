from typing import List, Dict, Any
import logging
import os
import tempfile
from PyPDF2 import PdfReader
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
    PDFPlumberLoader
)
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain.schema import Document
from ..models import Document as DBDocument
import time
import gc

logger = logging.getLogger(__name__)

class DocumentService:
    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=2048,  # Increase from 1024
            chunk_overlap=200,  # Increase from 80
            length_function=len,
            is_separator_regex=False
        )

    def process_file(self, file, file_type: str) -> str:
        """Process different file types and split into chunks."""
        temp_path = None
        try:
            # Créer un répertoire temporaire si nécessaire
            temp_dir = os.path.join(os.getcwd(), 'temp')
            os.makedirs(temp_dir, exist_ok=True)
            
            # Utiliser un nom de fichier unique
            temp_path = os.path.join(temp_dir, f"temp_{file.name}")
            
            # Écrire le fichier temporaire
            with open(temp_path, 'wb') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)
            
            # Extraire le texte selon le type de fichier
            if file_type == 'pdf':
                loader = PDFPlumberLoader(temp_path)
                docs = loader.load_and_split()
                text = '\n'.join([doc.page_content for doc in docs])
            elif file_type in ['txt', 'md']:
                with open(temp_path, 'r', encoding='utf-8') as text_file:
                    text = text_file.read()
            
            # Normaliser les espaces
            text = ' '.join(text.split())
            
            # Découper en phrases
            sentences = text.replace('? ', '?<split>').replace('! ', '!<split>').replace('. ', '.<split>').split('<split>')
            
            # Créer des chunks de taille maximale
            chunks = []
            current_chunk = ""
            
            for sentence in sentences:
                if len(current_chunk) + len(sentence) + 1 < 1000:
                    current_chunk += (sentence + " ").strip()
                else:
                    chunks.append(current_chunk)
                    current_chunk = sentence + " "
            
            if current_chunk:
                chunks.append(current_chunk)
            
            # Joindre les chunks avec des séparateurs
            return "\n\n".join(chunks)

        except Exception as e:
            logger.error(f"Error processing file: {str(e)}")
            raise
        
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except:
                    pass
            gc.collect()

    def store_document(self, content: str, metadata: dict) -> List[Document]:
        """Split content and prepare documents for vector store."""
        try:
            # Découper le contenu en chunks
            texts = self.text_splitter.split_text(content)
            logger.info(f"Split document into {len(texts)} chunks")
            
            # Créer les documents Langchain
            documents = []
            for i, text in enumerate(texts):
                doc_metadata = metadata.copy()
                doc_metadata['chunk_id'] = i
                documents.append(
                    Document(
                        page_content=text,
                        metadata=doc_metadata
                    )
                )
            
            logger.info(f"Created {len(documents)} Langchain documents")
            # Log le premier document pour vérification
            if documents:
                logger.info(f"Sample document content: {documents[0].page_content[:100]}...")
            
            return documents
            
        except Exception as e:
            logger.error(f"Error preparing documents: {str(e)}")
            raise

    def _chunk_content(self, content, chunk_size=1000, overlap=100):
        """Divise le contenu en chunks avec chevauchement."""
        chunks = []
        start = 0
        content_length = len(content)
        
        while start < content_length:
            end = start + chunk_size
            if end > content_length:
                end = content_length
            
            # Trouver la fin de la dernière phrase complète
            while end < content_length and content[end] not in ['.', '!', '?', '\n']:
                end += 1
            if end < content_length:
                end += 1
            
            chunk = content[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end - overlap
            
        return chunks