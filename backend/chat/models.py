from django.db import models

class Document(models.Model):
    name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10)
    upload_date = models.DateTimeField(auto_now_add=True)
    content = models.TextField()
    chroma_id = models.CharField(max_length=255, unique=True, null=True)

    def __str__(self):
        return self.name

class SharedChat(models.Model):
    chat_id = models.CharField(max_length=255, unique=True)
    history = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"SharedChat {self.chat_id}"