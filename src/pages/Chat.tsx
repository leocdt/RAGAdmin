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
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('chat_sessions');
    const savedOrder = localStorage.getItem('chatOrder');
    if (saved) {
      const sessions = JSON.parse(saved);
      if (savedOrder) {
        const orderIds = JSON.parse(savedOrder);
        return orderIds
          .map(id => sessions.find(s => s.id === id))
          .filter(Boolean);
      }
      return sessions;
    }
    return [];
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
    // Load shared chat if we're on a shared chat route
    const loadSharedChat = async (id: string) => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shared-chat/${id}/`);
        if (!response.ok) {
          throw new Error('Failed to load shared chat');
        }
        const data = await response.json();
        
        // Convert the shared chat history to the expected format
        const messages: Record<string, ChatMessage> = {};
        data.history.forEach((msg: any, index: number) => {
          messages[`${index}`] = {
            content: msg.content,
            role: msg.role === 'assistant' ? 'ai' : 'human',
            id: `${index}`,
            timestamp: msg.timestamp || msg.meta?.timestamp,
            used_documents: msg.used_documents || msg.meta?.used_documents || [],
            meta: {
              avatar: msg.role === 'assistant' ? '🤖' : '👤',
              type: msg.role === 'assistant' ? 'answer' : 'question',
              source: msg.role === 'assistant' ? 'bot' : 'human',
              timestamp: msg.timestamp || msg.meta?.timestamp,
              used_documents: msg.used_documents || msg.meta?.used_documents || []
            }
          };
        });

        // Create a new chat session with the shared chat data
        const newSession: ChatSession = {
          id: data.chatId,
          title: 'Shared Chat',
          messages,
          model: currentModel,
        };

        // Add the shared chat to sessions if it doesn't exist
        if (!chatSessions.some(chat => chat.id === data.chatId)) {
          setChatSessions(prev => [...prev, newSession]);
        }
        setCurrentChat(messages);
        chatKey.current += 1; // Force ProChat to re-render
      } catch (error) {
        console.error('Error loading shared chat:', error);
        message.error('Failed to load shared chat');
      }
    };

    if (chatId) {
      const existingChat = chatSessions.find(chat => chat.id === chatId);
      if (existingChat) {
        setCurrentChat(existingChat.messages);
        if (existingChat.model) {
          setCurrentModel(existingChat.model);
          localStorage.setItem('selected_model', existingChat.model);
        }
        chatKey.current += 1; // Force ProChat to re-render
      } else if (window.location.pathname.includes('/shared-chat/')) {
        loadSharedChat(chatId);
        chatKey.current += 1; // Force ProChat to re-render
      } else {
        // Handle invalid chat ID
        navigate('/');
      }
    } else {
      setCurrentChat(null);
    }
  }, [chatId, chatSessions, navigate, message, currentModel]);

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

  const handleChatsReorder = (newChats: ChatSession[]) => {
    setChatSessions(newChats);
    localStorage.setItem('chat_sessions', JSON.stringify(newChats));
    localStorage.setItem('chatOrder', JSON.stringify(newChats.map(chat => chat.id)));
  };

  const handleRenameChat = (chatId: string, newTitle: string) => {
    setChatSessions(prev => {
      const updated = prev.map(session =>
        session.id === chatId
          ? { ...session, title: newTitle }
          : session
      );
      localStorage.setItem('chat_sessions', JSON.stringify(updated));
      return updated;
    });
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
        onChatsReorder={handleChatsReorder}
        onRenameChat={handleRenameChat}
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