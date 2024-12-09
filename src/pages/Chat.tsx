import React, { useState, useEffect, useRef } from 'react';
import { ProChat } from '@ant-design/pro-chat';
import type { ChatMessage } from '@ant-design/pro-chat';
import { v4 as uuidv4 } from 'uuid';
import { useParams, useNavigate } from 'react-router-dom';
import ChatSidebar from '../components/ChatSidebar';

interface ChatSession {
  id: string;
  title: string;
  messages: Record<string, ChatMessage>;
}

const Chat: React.FC = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('chat_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentChat, setCurrentChat] = useState<Record<string, ChatMessage> | null>(null);
  const chatKey = useRef(0);

  useEffect(() => {
    if (!chatId && chatSessions.length === 0) {
      const newChatId = uuidv4();
      const newSession = { id: newChatId, title: 'New Chat', messages: {} };
      setChatSessions([newSession]);
      localStorage.setItem('chat_sessions', JSON.stringify([newSession]));
      navigate(`/chat/${newChatId}`);
    } else if (!chatId && chatSessions.length > 0) {
      navigate(`/chat/${chatSessions[0].id}`);
    }
  }, [chatId, chatSessions, navigate]);

  useEffect(() => {
    if (chatId) {
      const session = chatSessions.find(s => s.id === chatId);
      if (session) {
        setCurrentChat(session.messages);
      } else {
        setCurrentChat({});
      }
      chatKey.current += 1;
    }
  }, [chatId, chatSessions]);

  const handleNewChat = () => {
    const newChatId = uuidv4();
    const newSession = { id: newChatId, title: 'New Chat', messages: {} };
    setChatSessions(prev => {
      const updated = [...prev, newSession];
      localStorage.setItem('chat_sessions', JSON.stringify(updated));
      return updated;
    });
    navigate(`/chat/${newChatId}`);
  };

  const handleMessageSend = async (messages: ChatMessage[]) => {
    try {
      const lastMessage = messages[messages.length - 1]?.content || '';
      
      const history = messages.slice(0, -1).map(msg => ({
        content: msg.content,
        role: msg.role === 'assistant' ? 'ai' : 'human'
      }));
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/chat/`, {
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
      return response;

    } catch (error) {
      console.error('Error sending message:', error);
      return new Response('An error occurred while processing your message.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  };

  const handleChatsChange = (messages: Record<string, ChatMessage>) => {
    if (chatId) {
      setChatSessions(prev => {
        const updated = prev.map(session => 
          session.id === chatId 
            ? { ...session, messages, title: getFirstUserMessage(messages) || session.title }
            : session
        );
        localStorage.setItem('chat_sessions', JSON.stringify(updated));
        return updated;
      });
      setCurrentChat(messages);
    }
  };

  const getFirstUserMessage = (messages: Record<string, ChatMessage>): string => {
    const firstMessage = Object.values(messages).find(msg => msg.role === 'user');
    if (firstMessage?.content) {
      return firstMessage.content.slice(0, 30) + (firstMessage.content.length > 30 ? '...' : '');
    }
    return 'New Chat';
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <ChatSidebar 
        chats={chatSessions}
        onNewChat={handleNewChat}
        currentChatId={chatId}
      />
      <div className="flex-1">
        {currentChat !== null && chatId && (
          <ProChat
            key={chatKey.current}
            style={{ height: '100%' }}
            helloMessage="Welcome to RAGAdmin, your open-source RAG application!"
            request={handleMessageSend}
            initialChats={currentChat}
            onChatsChange={handleChatsChange}
            inputAreaProps={{
              placeholder: 'Enter your message...',
            }}
            locale="en-US"
          />
        )}
      </div>
    </div>

  );
};

export default Chat;
