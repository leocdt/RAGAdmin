from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    USER_ROLES = (
        ('admin', 'Admin'),
        ('user', 'User'),
    )
    role = models.CharField(max_length=10, choices=USER_ROLES, default='user')

    def is_admin(self):
        return self.role == 'admin'

class Document(models.Model):
    name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10)
    upload_date = models.DateTimeField(auto_now_add=True)
    content = models.TextField()
    chroma_id = models.CharField(max_length=255, unique=True, null=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True)

    def __str__(self):
        return self.name