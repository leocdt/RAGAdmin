from django.urls import path
from .views import ChatView, DocumentUploadView, DocumentListView, DocumentContentView

urlpatterns = [
    path('chat/', ChatView.as_view(), name='chat'),
    path('upload/', DocumentUploadView.as_view(), name='upload'),
    path('documents/', DocumentListView.as_view(), name='document-list'),
    path('documents/<int:document_id>/', DocumentListView.as_view(), name='document-delete'),
    path('documents/<int:document_id>/content/', DocumentContentView.as_view(), name='document-content'),
]