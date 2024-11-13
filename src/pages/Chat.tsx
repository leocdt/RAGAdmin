import React from 'react';
import { ProChat } from '@ant-design/pro-chat';
import axios from 'axios';

const Chat: React.FC = () => {
  const handleMessageSend = async (messages: any[]) => {
    try {
      // Récupérer le dernier message envoyé par l'utilisateur
      const lastMessage = messages[messages.length - 1]?.content || '';

      // Envoyer ce message au backend
      const response = await axios.post('http://localhost:8000/api/chat/', { message: lastMessage });

      // Utiliser directement la réponse du backend sans JSON.stringify, pour afficher un texte simple
      return new Response(response.data.response, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    } catch (error) {
      console.error('Error sending message:', error);
      return new Response('An error occurred while processing your message.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Chat with RAGAdmin</h1>
      <ProChat
        style={{ height: 'calc(100vh - 200px)' }}
        helloMessage="Welcome to RAGAdmin, your open-source RAG application!"
        request={handleMessageSend}
        inputAreaProps={{
          placeholder: 'Enter your message...',
        }}
        locale="en-US"

      />
    </div>
  );
};

export default Chat;
