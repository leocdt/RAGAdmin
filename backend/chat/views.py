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
import json

logger = logging.getLogger(__name__)

# Initialize services
vector_store_service = VectorStoreService()
document_service = DocumentService()
model = SentenceTransformer("all-MiniLM-L6-v2")
chat_service = ChatService(vector_store_service)

@method_decorator(csrf_exempt, name='dispatch')
class ChatView(APIView):
    def post(self, request):
        message = request.data.get('message', '')
        history = request.data.get('history', [])
        chat_id = request.data.get('chatId', '')
        model = request.data.get('model', '')
        use_context = request.data.get('useContext', True) 
        
        if not message or not chat_id:
            return Response(
                {'error': 'No message or chat ID provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Get the response from the chat service
            response = chat_service.generate_response(
                message, 
                chat_id, 
                history,
                model,
                use_context
            )
            
            # Stream only the text response
            def stream_response():
                # Return just the response string, nothing else
                yield response

            return StreamingHttpResponse(
                streaming_content=stream_response(),
                content_type='text/event-stream'
            )

        except Exception as e:
            logger.error(f"Error in chat: {str(e)}")
            return Response(
                {'error': 'An error occurred processing your request'},
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

class ModelListView(APIView):
    def get(self, request):
        try:
            # Run ollama list command and capture output
            result = subprocess.run(['ollama', 'list'], capture_output=True, text=True)
            
            if result.returncode != 0:
                return Response(
                    {'error': 'Failed to get model list'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Parse the output to extract model names
            lines = result.stdout.strip().split('\n')[1:]  # Skip header line
            models = [line.split()[0] for line in lines if line]
            
            return Response({'models': models})
            
        except Exception as e:
            logger.error(f"Error getting model list: {str(e)}")
            return Response(
                {'error': 'Failed to get model list'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )