from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Document
from .serializers import DocumentSerializer
import os

class ChatView(APIView):
    def post(self, request):
        message = request.data.get('message', '')
        response = f"Message well received: {message}"
        return Response({'response': response})

class DocumentUploadView(APIView):
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        file_extension = os.path.splitext(file.name)[1].lower()
        allowed_extensions = ['.pdf', '.md', '.txt']

        if file_extension not in allowed_extensions:
            return Response({'error': 'File extension not supported'}, status=status.HTTP_400_BAD_REQUEST)

        document = Document.objects.create(name=file.name, file_type=file_extension[1:])
        return Response({'message': 'Upload successful', 'document_id': document.id})

class DocumentListView(APIView):
    def get(self, request):
        documents = Document.objects.all()
        serializer = DocumentSerializer(documents, many=True)
        return Response(serializer.data)