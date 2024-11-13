from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Document
from .serializers import DocumentSerializer
import os
import tempfile
import chromadb
from PyPDF2 import PdfReader
import uuid
import ollama

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

        # Créer le document avec tous les champs en une seule fois
        document = Document.objects.create(
            name=file.name,
            file_type=file_type,
            content=content,
            chroma_id=str(uuid.uuid4())  # Génère un ID unique aléatoire
        )

        collection.add(
            documents=[content],
            metadatas=[{"filename": file.name, "id": str(document.id)}],
            ids=[document.chroma_id]  # Utiliser le chroma_id généré
        )

        return Response({'message': 'Upload successful', 'document_id': document.id})

class DocumentListView(APIView):
    def get(self, request):
        documents = Document.objects.all()
        serializer = DocumentSerializer(documents, many=True)
        return Response(serializer.data)
    
    def delete(self, request, document_id):
        try:
            document = Document.objects.get(id=document_id)
            # Delete from ChromaDB
            collection.delete(ids=[document.chroma_id])
            # Delete from SQLite
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
        
        # 1. Recherche dans les documents avec ChromaDB
        results = collection.query(
            query_texts=[message],
            n_results=2  # Récupérer les 2 résultats les plus pertinents
        )
        
        # 2. Préparer le contexte pour le LLM
        context = ""
        if results['documents'][0]:
            context = "\n".join(results['documents'][0])
            
        # 3. Construire le prompt avec le contexte
        system_prompt = f"""You are RAGAdmin, a helpful assistant whose job is to answer questions from employees of the French company La Poste. Use the following context to answer the question. 
        If the context doesn't contain relevant information, say so.
        
        Context:
        {context}
        
        Answer in the same language as the question."""
        
        # 4. Appeler le LLM avec le contexte
        response = ollama.chat(model="llama3.1:8b", messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": message
            }
        ])
        
        response_content = response['message']['content']
        
        # 5. Ajouter les sources utilisées
        if results['documents'][0]:
            sources = [meta['filename'] for meta in results['metadatas'][0]]
            response_content += f"\n\nSources: {', '.join(sources)}"
        
        return Response({"response": response_content})
#initialize_chroma()
