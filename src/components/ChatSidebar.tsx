import React, { useState, useCallback, useMemo } from 'react';
import { Popconfirm, Input, message } from 'antd';
import { MessageSquare, Plus, Trash2, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { App } from 'antd';

interface ChatSession {
  id: string;
  title: string;
  messages: Record<string, any>;
}

interface ChatSidebarProps {
  chats: ChatSession[];
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  currentChatId?: string;
  onChatsReorder?: (newChats: ChatSession[]) => void;
  onRenameChat?: (chatId: string, newTitle: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
  chats, 
  onNewChat, 
  onDeleteChat, 
  currentChatId, 
  onChatsReorder,
  onRenameChat 
}) => {
  const { message } = App.useApp();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDrop = useCallback((dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newChats = [...chats];
    const [draggedChat] = newChats.splice(draggedIndex, 1);
    newChats.splice(dropIndex, 0, draggedChat);
    onChatsReorder?.(newChats);
    setDraggedIndex(null);
  }, [chats, draggedIndex, onChatsReorder]);

  const handleDoubleClick = useCallback((chatId: string, currentTitle: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
  }, []);

  const handleRenameSubmit = useCallback(() => {
    if (editingChatId && onRenameChat && editingTitle.trim()) {
      onRenameChat(editingChatId, editingTitle.trim());
    }
    setEditingChatId(null);
  }, [editingChatId, editingTitle, onRenameChat]);

  const handleRenameCancel = useCallback(() => {
    setEditingChatId(null);
  }, []);

  const handleShare = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const chatToShare = chats.find(chat => chat.id === chatId);
      if (!chatToShare) {
        throw new Error('Chat not found');
      }

      const formattedHistory = Object.values(chatToShare.messages).map(msg => ({
        content: msg.content,
        role: msg.role === 'ai' ? 'assistant' : 'human',
        timestamp: msg.meta?.timestamp || new Date().toISOString(),
        used_documents: msg.meta?.used_documents || [],
        meta: {
          avatar: msg.role === 'ai' ? '🤖' : '👤',
          type: msg.role === 'ai' ? 'answer' : 'question',
          source: msg.role === 'ai' ? 'bot' : 'human',
          timestamp: msg.meta?.timestamp || new Date().toISOString(),
          used_documents: msg.meta?.used_documents || []
        }
      }));

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/share-chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          history: formattedHistory,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to share chat');
      }

      const data = await response.json();
      const shareUrl = `${window.location.origin}/shared-chat/${data.chatId}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      message.success('Share link copied to clipboard!');
    } catch (error) {
      console.error('Error sharing chat:', error);
      message.error('Failed to share chat');
    }
  };

  const renderChatItem = useCallback((chat: ChatSession, index: number) => {
    const isEditing = editingChatId === chat.id;
    const isDragging = draggedIndex === index;

    return (
      <div
        key={chat.id}
        className={`chat-item flex items-center p-2 ${isDragging ? 'opacity-50' : ''}`}
        draggable
        onDragStart={() => handleDragStart(index)}
        onDragOver={(e) => {
          e.preventDefault();
          const target = e.currentTarget;
          const boundingRect = target.getBoundingClientRect();
          const mouseY = e.clientY;
          const threshold = boundingRect.top + boundingRect.height / 2;
          
          target.classList.remove('drag-over-top', 'drag-over-bottom');
          if (mouseY < threshold) {
            target.classList.add('drag-over-top');
          } else {
            target.classList.add('drag-over-bottom');
          }
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
          handleDrop(index);
        }}
        onDoubleClick={(e) => handleDoubleClick(chat.id, chat.title, e)}
      >
        <MessageSquare size={16} className="mr-2" />
        {isEditing ? (
          <Input
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onPressEnter={handleRenameSubmit}
            onBlur={handleRenameCancel}
            autoFocus
            size="small"
            className="flex-1 mr-2"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        ) : (
          <>
            <Link 
              to={`/chat/${chat.id}`} 
              className="flex-1 truncate"
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            >
              {chat.title}
            </Link>
            <button
              onClick={(e) => handleShare(chat.id, e)}
              className="shareButtonChat mr-2"
              draggable={false}
            >
              <Share2 size={16} />
            </button>
            <Popconfirm
              title="Delete chat"
              description="Are you sure you want to delete this chat?"
              onConfirm={() => onDeleteChat(chat.id)}
              okText="Yes"
              cancelText="No"
            >
              <button
                onClick={(e) => e.stopPropagation()}
                className="deleteButtonChat"
                draggable={false}
              >
                <Trash2 size={16} />
              </button>
            </Popconfirm>
          </>
        )}
      </div>
    );
  }, [editingChatId, editingTitle, draggedIndex, handleDoubleClick, handleDrop, handleRenameSubmit, handleRenameCancel, onDeleteChat, handleShare]);

  return (
    <div className="w-64 border-r h-full flex flex-col container-sidebar-chat">
      <div className="p-4 border-b container-button-new-chat flex items-center justify-center">
        <button
          onClick={onNewChat}
          className="w-3/4 flex items-center justify-center gap-2 bg-[#1677ff] text-white px-4 py-2 rounded hover:bg-[#0958d9] btn-new-chat"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat, index) => renderChatItem(chat, index))}
      </div>
      <style>
        {`
          .chat-item {
            cursor: pointer;
            background: white;
            transition: background-color 0.2s;
            user-select: none;
          }
          .chat-item:hover {
            background: #f5f5f5;
          }
          .chat-item.drag-over-top {
            border-top: 2px solid #1677ff;
          }
          .chat-item.drag-over-bottom {
            border-bottom: 2px solid #1677ff;
          }
          .chat-item.opacity-50 {
            opacity: 0.5;
          }
          .shareButtonChat,
          .deleteButtonChat {
            opacity: 0;
            transition: opacity 0.2s;
            color: #666;
            padding: 4px;
            border-radius: 4px;
          }
          .shareButtonChat:hover,
          .deleteButtonChat:hover {
            background: #e6e6e6;
          }
          .chat-item:hover .shareButtonChat,
          .chat-item:hover .deleteButtonChat {
            opacity: 1;
          }
          [draggable] {
            cursor: pointer !important;
          }
          [draggable] * {
            cursor: pointer !important;
          }
        `}
      </style>
    </div>
  );
};

export default React.memo(ChatSidebar);