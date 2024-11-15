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

logger = logging.getLogger(__name__)

# Initialize services
vector_store_service = VectorStoreService()
document_service = DocumentService()
chat_service = ChatService(vector_store_service)

@method_decorator(csrf_exempt, name='dispatch')
class ChatView(APIView):
    def post(self, request):
        message = request.data.get('message', '')
        if not message:
            return Response(
                {'error': 'No message provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            response_data = chat_service.generate_response(message)
            return Response(response_data)
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
            document = Document.objects.create(
                name=file.name,
                file_type=file_extension,
                content=content
            )

            # Prepare and store in vector database
            documents = document_service.store_document(
                content,
                {"filename": file.name, "id": str(document.id)}
            )
            vector_store_service.add_documents(documents)

            return Response({
                'message': 'Upload successful',
                'document_id': document.id
            })

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
            vector_store_service.delete_document(str(document.id))
            document.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Document.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

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