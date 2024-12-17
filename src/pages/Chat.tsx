import React, { useState, useEffect, useRef } from 'react';
import { ProChat } from '@ant-design/pro-chat';
import type { ChatMessage } from '@ant-design/pro-chat';
import { v4 as uuidv4 } from 'uuid';
import { useParams, useNavigate } from 'react-router-dom';
import ChatSidebar from '../components/ChatSidebar';
import ModelSidebar from '../components/ModelSidebar';
import { App } from 'antd';

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
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('chat_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentChat, setCurrentChat] = useState<Record<string, ChatMessage> | null>(null);
  const [currentModel, setCurrentModel] = useState<string>(() => {
    return localStorage.getItem('selected_model') || 'Failed to fetch models';
  });
  const [models, setModels] = useState<string[]>([]);
  const chatKey = useRef(0);

  useEffect(() => {
    if (!chatId && chatSessions.length === 0) {
      const newChatId = uuidv4();
      const newSession = { 
        id: newChatId, 
        title: 'New Chat', 
        messages: {},
        model: currentModel 
      };
      setChatSessions([newSession]);
      localStorage.setItem('chat_sessions', JSON.stringify([newSession]));
      navigate(`/chat/${newChatId}`);
    } else if (!chatId && chatSessions.length > 0) {
      navigate(`/chat/${chatSessions[0].id}`);
    }
  }, [chatId, chatSessions, navigate, currentModel]);

  useEffect(() => {
    if (chatId) {
      const session = chatSessions.find(s => s.id === chatId);
      if (session) {
        setCurrentChat(session.messages);
        if (session.model) {
          setCurrentModel(session.model);
          localStorage.setItem('selected_model', session.model);
        }
      } else {
        setCurrentChat({});
      }
      chatKey.current += 1;
    }
  }, [chatId, chatSessions]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/models/`);
        if (!response.ok) throw new Error('Failed to fetch models');
        const data = await response.json();
        setModels(data.models || []);
      } catch (error) {
        console.error('Error fetching models:', error);
        // Fallback models if API fails
        setModels(['Failed to fetch models']);
      }
    };
    fetchModels();
  }, []);

  const handleModelChange = (model: string) => {
    setCurrentModel(model);
    localStorage.setItem('selected_model', model);
    if (chatId) {
      setChatSessions(prev => {
        const updated = prev.map(session =>
          session.id === chatId
            ? { ...session, model }
            : session
        );
        localStorage.setItem('chat_sessions', JSON.stringify(updated));
        return updated;
      });
    }
    message.success(`Switched to ${model} model`);
  };

  const handleNewChat = () => {
    const newChatId = uuidv4();
    const newSession = { 
      id: newChatId, 
      title: 'New Chat', 
      messages: {},
      model: currentModel 
    };
    setChatSessions(prev => {
      const updated = [...prev, newSession];
      localStorage.setItem('chat_sessions', JSON.stringify(updated));
      return updated;
    });
    navigate(`/chat/${newChatId}`);
  };

  const handleDeleteChat = (chatIdToDelete: string) => {
    setChatSessions(prev => {
      const updated = prev.filter(chat => chat.id !== chatIdToDelete);
      localStorage.setItem('chat_sessions', JSON.stringify(updated));
      return updated;
    });
    
    if (chatId === chatIdToDelete) {
      const remainingChats = chatSessions.filter(chat => chat.id !== chatIdToDelete);
      if (remainingChats.length > 0) {
        navigate(`/chat/${remainingChats[0].id}`);
      } else {
        handleNewChat();
      }
    }
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
          history: history,
          model: currentModel
        }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      return response;

    } catch (error) {
      console.error('Error sending message:', error);
      message.error('Failed to send message. Please try again.');
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
            ? { 
                ...session, 
                messages, 
                title: getFirstUserMessage(messages) || session.title,
                model: currentModel
              }
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
    <div className="chat-container" style={{ height: 'calc(100vh - 64px)' }}>
      <ChatSidebar 
        chats={chatSessions}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        currentChatId={chatId}
      />
      <div className="flex-1 relative">
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
        <div className="absolute top-0 right-0 z-10">
          <ModelSidebar
            currentModel={currentModel}
            onModelChange={handleModelChange}
            models={models}
          />
        </div>
      </div>
    </div>
  );
};

export default Chat;