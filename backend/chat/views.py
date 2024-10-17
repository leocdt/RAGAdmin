from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Document
from .serializers import DocumentSerializer
import os
import tempfile
import chromadb
from PyPDF2 import PdfReader

chroma_client = chromadb.Client()
collection = chroma_client.create_collection("documents")

def process_file(file, file_type):
    content = ""
    if file_type == 'pdf':
        pdf_reader = PdfReader(file)
        for page in pdf_reader.pages:
            content += page.extract_text()
    elif file_type == 'md':
        content = file.read().decode('utf-8')
    elif file_type == 'txt':
        content = file.read().decode('utf-8')
    return content

class DocumentUploadView(APIView):
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        file_extension = os.path.splitext(file.name)[1].lower()
        allowed_extensions = ['.pdf', '.md', '.txt']

        if file_extension not in allowed_extensions:
            return Response({'error': 'File extension not supported'}, status=status.HTTP_400_BAD_REQUEST)

        file_type = file_extension[1:]
        content = process_file(file, file_type)

        document = Document.objects.create(
            name=file.name,
            file_type=file_type,
            content=content
        )

        collection.add(
            documents=[content],
            metadatas=[{"filename": file.name, "id": str(document.id)}],
            ids=[str(document.id)]
        )

        return Response({'message': 'Upload successful', 'document_id': document.id})

class DocumentListView(APIView):
    def get(self, request):
        documents = Document.objects.all()
        serializer = DocumentSerializer(documents, many=True)
        return Response(serializer.data)

def initialize_chroma():
    documents = Document.objects.all()
    for doc in documents:
        collection.add(
            documents=[doc.content],
            metadatas=[{"filename": doc.name, "id": str(doc.id)}],
            ids=[str(doc.id)]
        )

class ChatView(APIView):
    def post(self, request):
        message = request.data.get('message', '')
        results = collection.query(
            query_texts=[message],
            n_results=1
        )
        if results['documents'][0]:
            response = f"Based on the document: {results['metadatas'][0][0]['filename']}\n\n{results['documents'][0][0][:500]}..."
        else:
            response = "I couldn't find any relevant information in the documents."
        return Response({'response': response})
    
#initialize_chroma()