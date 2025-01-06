from django.urls import path
from .views import (
    ChatView, 
    DocumentUploadView, 
    DocumentListView, 
    DocumentContentView, 
    ModelListView, 
    login, 
    create_user, 
    user_list, 
    delete_user,
    chat
)

urlpatterns = [
    path('chat/', chat, name='chat'),
    path('documents/', DocumentListView.as_view(), name='document-list'),
    path('documents/<str:document_id>/', DocumentListView.as_view(), name='document-delete'),
    path('documents/<str:document_id>/content/', DocumentContentView.as_view(), name='document-content'),
    path('upload/', DocumentUploadView.as_view(), name='document-upload'),
    path('models/', ModelListView.as_view(), name='model-list'),
    path('login/', login, name='login'),
    path('users/create/', create_user, name='create-user'),
    path('users/', user_list, name='user-list'),
    path('users/<int:user_id>/', delete_user, name='user-delete'),
]