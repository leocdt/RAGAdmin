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
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from .permissions import IsAdmin
from .serializers import UserSerializer
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from django.conf import settings

logger = logging.getLogger(__name__)

# Initialize services
vector_store_service = VectorStoreService()
document_service = DocumentService()

@method_decorator(csrf_exempt, name='dispatch')
class ChatView(APIView):
    def post(self, request):
        message = request.data.get('message', '')
        history = request.data.get('history', [])
        chat_id = request.data.get('chatId', '')
        model_name = request.data.get('model', 'llama2')  # Default to llama2 if not specified
        
        # Create chat service with selected model
        chat_service = ChatService(vector_store_service, model_name=model_name)
        
        # Map the history roles correctly
        formatted_history = []
        for msg in history:
            role = msg.get('role', '')
            # Map 'ai' role to 'assistant'
            if role == 'ai':
                role = 'assistant'
            formatted_history.append({
                'role': role,
                'content': msg.get('content', '')
            })
        
        if not message or not chat_id:
            return Response(
                {'error': 'No message or chat ID provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            response = chat_service.generate_response(
                message, 
                chat_id, 
                formatted_history
            )
            
            def stream_response():
                for chunk in response:
                    yield chunk

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

@method_decorator(csrf_exempt, name='dispatch')
class ModelListView(APIView):
    def get(self, request):
        try:
            # Run 'ollama list' command
            result = subprocess.run(['ollama', 'list'], capture_output=True, text=True)
            
            if result.returncode != 0:
                return Response(
                    {'error': 'Failed to get models list'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Parse the output to get model names
            models = []
            for line in result.stdout.strip().split('\n')[1:]:  # Skip header line
                if line:
                    model_name = line.split()[0]  # First column is model name
                    models.append(model_name)
            
            return Response({'models': models})
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['POST'])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    
    if user is not None:
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'role': user.role,
            'username': user.username,
            'is_admin': user.role == 'admin'
        })
    else:
        return Response({'error': 'Invalid credentials'}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def user_list(request):
    """Liste tous les utilisateurs (accessible uniquement aux admins)"""
    users = User.objects.all()
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def create_user(request):
    """Crée un nouvel utilisateur (accessible uniquement aux admins)"""
    data = request.data.copy()
    # Hash le mot de passe avant de le sauvegarder
    data['password'] = make_password(data['password'])
    serializer = UserSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def delete_user(request, user_id):
    """Supprime un utilisateur (accessible uniquement aux admins)"""
    try:
        user = User.objects.get(id=user_id)
        user.delete()
        return Response(status=204)
    except User.DoesNotExist:
        return Response(status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat(request):
    """
    Point de terminaison pour gérer les requêtes de chat
    """
    try:
        message = request.data.get('message')
        chat_id = request.data.get('chat_id')
        model = request.data.get('model', settings.DEFAULT_LLM_MODEL)
        
        if not message:
            return Response({'error': 'Message is required'}, status=400)
            
        chat_service = ChatService()
        response = chat_service.generate_response(
            query=message,
            chat_id=chat_id,
            model=model
        )
        
        return Response({
            'response': response,
            'chat_id': chat_id
        })
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return Response({
            'error': 'An error occurred while processing your request'
        }, status=500)