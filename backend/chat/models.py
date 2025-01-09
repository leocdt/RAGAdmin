from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLES = (
        ('user', 'User'),
        ('admin', 'Admin'),
    )
    
    role = models.CharField(max_length=10, choices=ROLES, default='user')
    
    class Meta:
        db_table = 'auth_user'

class Document(models.Model):
    name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10)
    upload_date = models.DateTimeField(auto_now_add=True)
    content = models.TextField()
    chroma_id = models.CharField(max_length=255, unique=True, null=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True)

    def __str__(self):
        return self.name