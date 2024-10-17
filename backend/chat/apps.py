from django.apps import AppConfig

class ChatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'chat'

    def ready(self):
        # Import and call initialize_chroma here, but only when not running migrations
        from django.db import connection
        if connection.connection is not None:
            from .views import initialize_chroma
            initialize_chroma()
