import React from 'react';
import { ProChat } from '@ant-design/pro-chat';

const Chat: React.FC = () => {
  const handleMessageSend = async (messages: any[]) => {
    try {
      const lastMessage = messages[messages.length - 1]?.content || '';
      
      const response = await fetch('http://localhost:8000/api/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: lastMessage }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let responseText = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        responseText += chunk;
        
        const partialResponse = new Response(responseText, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });

        messages[messages.length - 1].streamingResponse = partialResponse;
      }

      return new Response(responseText, {
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
/>
    </div>
  );
};

export default Chat;
