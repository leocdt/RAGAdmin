import React, { useState, useEffect, useRef } from 'react';
import { ProChat } from '@ant-design/pro-chat';
import type { ChatMessage } from '@ant-design/pro-chat';
import { v4 as uuidv4 } from 'uuid';
import { useParams, useNavigate } from 'react-router-dom';
import ChatSidebar from '../components/ChatSidebar';
import ModelSidebar from '../components/ModelSidebar';
import { App } from 'antd';
import '../styles/chat.css';

interface ChatSession {
  id: string;
  title: string;
  messages: Record<string, ChatMessage>;
  model?: string;
}

const Chat: React.FC = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentModel, setCurrentModel] = useState('llama2');
  const [models, setModels] = useState<string[]>([]);
  const chatKey = useRef(Date.now());

  useEffect(() => {
    // Charger les modèles disponibles
    const fetchModels = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_LLM_URL}/api/tags`);
        const data = await response.json();
        setModels(data.models || []);
      } catch (error) {
        console.error('Error fetching models:', error);
        setModels([]);
      }
    };

    fetchModels();

    // Charger les sessions de chat sauvegardées
    const saved = localStorage.getItem('chat_sessions');
    if (saved) {
      setChatSessions(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (!chatId && chatSessions.length > 0) {
      navigate(`/chat/${chatSessions[0].id}`);
    }
  }, [chatId, chatSessions, navigate]);

  const handleNewChat = () => {
    const newChat: ChatSession = {
      id: uuidv4(),
      title: 'New Chat',
      messages: {},
      model: currentModel
    };

    setChatSessions(prev => {
      const updated = [newChat, ...prev];
      localStorage.setItem('chat_sessions', JSON.stringify(updated));
      return updated;
    });

    navigate(`/chat/${newChat.id}`);
  };

  const handleDeleteChat = (id: string) => {
    setChatSessions(prev => {
      const updated = prev.filter(chat => chat.id !== id);
      localStorage.setItem('chat_sessions', JSON.stringify(updated));
      return updated;
    });

    if (chatId === id) {
      navigate('/chat');
    }
  };

  const handleChatsReorder = (newChats: ChatSession[]) => {
    setChatSessions(newChats);
    localStorage.setItem('chat_sessions', JSON.stringify(newChats));
  };

  const handleRenameChat = (chatId: string, newTitle: string) => {
    setChatSessions(prev => {
      const updated = prev.map(chat => 
        chat.id === chatId ? { ...chat, title: newTitle } : chat
      );
      localStorage.setItem('chat_sessions', JSON.stringify(updated));
      return updated;
    });
  };

  const handleModelChange = (model: string) => {
    setCurrentModel(model);
    if (chatId) {
      setChatSessions(prev => {
        const updated = prev.map(chat => 
          chat.id === chatId ? { ...chat, model } : chat
        );
        localStorage.setItem('chat_sessions', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleMessageSend = async (messages: ChatMessage[]) => {
    try {
      const userMessage = messages[messages.length - 1].content;
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          message: userMessage,
          chat_id: chatId,
          model: currentModel
        }),
      });

      if (!response.ok) throw new Error('Chat request failed');
      
      const data = await response.json();
      return data.response;
    } catch (error) {
      message.error('Failed to send message');
      return 'Sorry, there was an error processing your message.';
    }
  };

  const currentChat = chatId 
    ? chatSessions.find(chat => chat.id === chatId)?.messages
    : null;

  const handleChatsChange = (newMessages: Record<string, ChatMessage>) => {
    if (chatId) {
      setChatSessions(prev => {
        const updated = prev.map(chat => 
          chat.id === chatId ? { ...chat, messages: newMessages } : chat
        );
        localStorage.setItem('chat_sessions', JSON.stringify(updated));
        return updated;
      });
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <ChatSidebar
        chats={chatSessions}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        currentChatId={chatId}
        onChatsReorder={handleChatsReorder}
        onRenameChat={handleRenameChat}
      />
      <div className="flex-1">
        {currentChat !== null && chatId ? (
          <ProChat
            key={chatKey.current}
            style={{ height: '100%' }}
            helloMessage="Welcome to RAGAdmin, your open-source RAG application!"
            request={handleMessageSend}
            initialChats={currentChat}
            onChatsChange={handleChatsChange}
            locale="en-US"
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <button
              onClick={handleNewChat}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Start a new chat
            </button>
          </div>
        )}
      </div>
      <ModelSidebar
        currentModel={currentModel}
        onModelChange={handleModelChange}
        models={models}
      />
    </div>
  );
};

export default Chat;