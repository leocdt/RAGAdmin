from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import logging
from .models import Document
from .serializers import DocumentSerializer
from .services.document_service import DocumentService
from .services.vector_store_service import VectorStoreService
from .services.chat_service import ChatService
import os
import uuid
import gc
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer, util
import torch
from django.http import StreamingHttpResponse
import subprocess
from django.conf import settings

logger = logging.getLogger(__name__)

# Initialize services
vector_store_service = VectorStoreService()
document_service = DocumentService()
model = SentenceTransformer("all-MiniLM-L6-v2")
chat_service = ChatService(vector_store_service)

@method_decorator(csrf_exempt, name='dispatch')
class ChatView(APIView):
    def post(self, request):
        try:
            message = request.data.get('message', '')
            history = request.data.get('history', [])
            chat_id = request.data.get('chatId', '')
            model = request.data.get('model', settings.OLLAMA_MODEL)
            
            # Add logging
            print(f"Received request - Model: {model}, Message: {message}, Chat ID: {chat_id}")
            
            chat_service = ChatService(VectorStoreService())
            response = chat_service.generate_response(
                message=message,
                history=history,
                model=model,
                chat_id=chat_id
            )
            
            return Response(response)
            
        except Exception as e:
            print(f"Error in ChatView: {str(e)}")  # Add logging
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class DocumentUploadView(APIView):
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            file_extension = os.path.splitext(file.name)[1].lower()[1:]
            if file_extension not in ['pdf', 'md', 'txt']:
                return Response(
                    {'error': 'File extension not supported'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Process and store document
            content = document_service.process_file(file, file_extension)
            gc.collect()

            # Générer un chroma_id unique
            chroma_id = str(uuid.uuid4())
            
            # Créer le document avec le chroma_id
            document = Document.objects.create(
                name=file.name,
                file_type=file_extension,
                content=content,
                chroma_id=chroma_id
            )

            # Prepare and store in vector database
            documents = document_service.store_document(
                content,
                {"filename": file.name, "id": str(document.id), "chroma_id": chroma_id}
            )
            
            # Ajouter les documents au vector store par lots
            batch_size = 5
            for i in range(0, len(documents), batch_size):
                batch = documents[i:i + batch_size]
                vector_store_service.add_documents(batch)
                gc.collect()

            return Response({
                'message': 'Upload successful',
                'document_id': document.id,
                'chroma_id': chroma_id
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error in document upload: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class DocumentListView(APIView):
    def get(self, request):
        documents = Document.objects.all()
        serializer = DocumentSerializer(documents, many=True)
        return Response(serializer.data)
    
    def delete(self, request, document_id):
        try:
            document = Document.objects.get(id=document_id)
            # Supprimer d'abord de ChromaDB
            vector_store_service.delete_document(document.chroma_id)
            # Puis supprimer de la base de données
            document.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Document.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error deleting document: {str(e)}")
            return Response(
                {'error': 'An error occurred while deleting the document'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class DocumentContentView(APIView):
    def get(self, request, document_id):
        try:
            document = Document.objects.get(id=document_id)
            return Response({
                'content': document.content,
                'name': document.name,
                'file_type': document.file_type
            })
        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class OllamaModelsView(APIView):
    def get(self, request):
        try:
            result = subprocess.run(['ollama', 'list'], capture_output=True, text=True)
            models = []
            for line in result.stdout.split('\n')[1:]:  # Skip header line
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 2:  # Ensure we have at least name and size
                        models.append({
                            'name': parts[0],
                            'size': parts[1]
                        })
            return Response({'models': models})
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch Ollama models: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UpdateSettingsView(APIView):
    def post(self, request):
        try:
            model = request.data.get('model')
            if model:
                settings.OLLAMA_MODEL = model
                return Response({'message': f'Model updated to {model}'})
            return Response(
                {'error': 'No model provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to update settings: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )