import React, { useState } from 'react';
import { Menu, Input, Popconfirm } from 'antd';
import { MessageSquare, Plus, Edit2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ChatSession {
  id: string;
  title: string;
  messages: Record<string, any>;
}

interface ChatSidebarProps {
  chats: ChatSession[];
  onNewChat: () => void;
  currentChatId?: string;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onDeleteChat: (chatId: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
  chats, 
  onNewChat, 
  currentChatId,
  onRenameChat,
  onDeleteChat 
}) => {
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartEdit = (chatId: string, title: string) => {
    setEditingChatId(chatId);
    setEditTitle(title);
  };

  const handleFinishEdit = () => {
    if (editingChatId && editTitle.trim()) {
      onRenameChat(editingChatId, editTitle.trim());
    }
    setEditingChatId(null);
    setEditTitle('');
  };

  const handleDoubleClick = (chatId: string, title: string) => {
    setEditingChatId(chatId);
    setEditTitle(title);
  };

  return (
    <div className="w-64 bg-white border-r h-full overflow-y-auto container-sidebar">
      <div className="p-4 pt-8 flex justify-center">
        <button
          onClick={onNewChat}
          className="w-[60%] flex items-center justify-center gap-2 bg-[#1677ff] text-white px-4 py-2 rounded hover:bg-[#0958d9] btn-new-chat"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>
      <Menu
        mode="inline"
        selectedKeys={currentChatId ? [currentChatId] : []}
        items={chats.map((chat) => ({
          key: chat.id,
          icon: <MessageSquare size={16} />,
          label: (
            <div className="flex items-center justify-between w-full pr-2 relative">
              {editingChatId === chat.id ? (
                <Input
                  size="small"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onPressEnter={handleFinishEdit}
                  onBlur={handleFinishEdit}
                  autoFocus
                />
              ) : (
                <>
                  <Link 
                    to={`/chat/${chat.id}`} 
                    className="flex-1 truncate mr-6" // Added margin-right to make space for delete button
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      handleDoubleClick(chat.id, chat.title);
                    }}
                  >
                    {chat.title}
                  </Link>
                  <div className="chat-actions absolute right-2" style={{ zIndex: 100 }}>
                    <Popconfirm
                      title="Delete chat"
                      description="Are you sure you want to delete this chat?"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Trash2
                        size={14}
                        className="cursor-pointer text-gray-500 hover:text-red-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </div>
                </>
              )}
            </div>
          ),
        }))}
      />
    </div>
  );
};

export default ChatSidebar;