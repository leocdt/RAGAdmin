from django.urls import path
from .views import (
    ChatView, DocumentUploadView, DocumentListView, 
    DocumentContentView, ModelListView, ChatShareView
)

urlpatterns = [
    path('chat/', ChatView.as_view(), name='chat'),
    path('documents/', DocumentListView.as_view(), name='document-list'),
    path('documents/<str:document_id>/', DocumentListView.as_view(), name='document-delete'),
    path('documents/<str:document_id>/content/', DocumentContentView.as_view(), name='document-content'),
    path('upload/', DocumentUploadView.as_view(), name='document-upload'),
    path('models/', ModelListView.as_view(), name='model-list'),
    path('share-chat/', ChatShareView.as_view(), name='share-chat'),
    path('shared-chat/<str:chat_id>/', ChatShareView.as_view(), name='get-shared-chat'),
]