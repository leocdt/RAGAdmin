import React, { useState, useEffect } from 'react';
import { ProChat } from '@ant-design/pro-chat';
import type { ChatMessage } from '@ant-design/pro-chat';
import { v4 as uuidv4 } from 'uuid';
import { setCookie, getCookie } from '../utils/cookies';

const Chat: React.FC = () => {
  const [chatId] = useState(() => getCookie('chatId') || uuidv4());
  const [cachedChats, setCachedChats] = useState<Record<string, ChatMessage> | null>(null);

  useEffect(() => {
    setCookie('chatId', chatId);
    const cachedData = localStorage.getItem(`chat_${chatId}`);
    if (cachedData) {
      setCachedChats(JSON.parse(cachedData));
    } else {
      setCachedChats({});
    }
  }, [chatId]);

  const handleMessageSend = async (messages: ChatMessage[]) => {
    try {
      const lastMessage = messages[messages.length - 1]?.content || '';
      
      const history = messages.slice(0, -1).map(msg => ({
        content: msg.content,
        role: msg.role === 'assistant' ? 'ai' : 'human'
      }));
      
      const response = await fetch('http://localhost:8000/api/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: lastMessage,
          chatId: chatId,
          history: history
        }),
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

  const handleChatsChange = (chats: Record<string, ChatMessage>) => {
    setCachedChats(chats);
    localStorage.setItem(`chat_${chatId}`, JSON.stringify(chats));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Chat with RAGAdmin</h1>
      {cachedChats !== null && (
        <ProChat
          style={{ height: 'calc(100vh - 200px)' }}
          helloMessage="Welcome to RAGAdmin, your open-source RAG application!"
          request={handleMessageSend}
          initialChats={cachedChats}
          onChatsChange={handleChatsChange}
          inputAreaProps={{
            placeholder: 'Enter your message...',
          }}
        />
      )}
    </div>
  );
};

export default Chat;
