from django.db import models
  
class Document(models.Model):
    name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10)
    upload_date = models.DateTimeField(auto_now_add=True)
    content = models.TextField()  # Store the extracted content
    chroma_id = models.CharField(max_length=255, unique=True)  # Store ChromaDB ID

    def __str__(self):
        return self.name