from typing import List, Dict, Any
import logging
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    UnstructuredMarkdownLoader
)
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain.schema import Document
from ..models import Document as DBDocument

logger = logging.getLogger(__name__)

class DocumentService:
    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )

    def process_file(self, file, file_type: str) -> str:
        """Process different file types using appropriate LangChain loaders."""
        try:
            temp_path = f"/tmp/{file.name}"
            with open(temp_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)

            if file_type == 'pdf':
                loader = PyPDFLoader(temp_path)
            elif file_type == 'txt':
                loader = TextLoader(temp_path)
            elif file_type == 'md':
                loader = UnstructuredMarkdownLoader(temp_path)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")

            documents = loader.load()
            return "\n\n".join(doc.page_content for doc in documents)

        except Exception as e:
            logger.error(f"Error processing file: {str(e)}")
            raise
        finally:
            import os
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def store_document(self, content: str, metadata: Dict[str, Any]) -> List[Document]:
        """Split document into chunks and prepare for vector store."""
        try:
            texts = self.text_splitter.split_text(content)
            documents = [
                Document(
                    page_content=text,
                    metadata=metadata
                )
                for text in texts
            ]
            return documents
        except Exception as e:
            logger.error(f"Error storing document: {str(e)}")
            raise