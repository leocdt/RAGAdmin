import React from 'react';
import { Menu, Popconfirm } from 'antd';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

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
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ chats, onNewChat, onDeleteChat, currentChatId }) => {
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
        <Menu
          mode="inline"
          selectedKeys={currentChatId ? [currentChatId] : []}
          items={chats.map((chat) => ({
            key: chat.id,
            icon: <MessageSquare size={16} />,
            label: (
              <div className="flex items-center justify-between w-full pr-2" onClick={(e) => e.stopPropagation()}>
                <Link to={`/chat/${chat.id}`} className="flex-1 truncate" onClick={(e) => e.stopPropagation()}>
                  {chat.title}
                </Link>
                {chats.length > 1 && (
                  <Popconfirm
                    title="Delete chat"
                    description="Are you sure you want to delete this chat?"
                    onConfirm={(e) => {
                      if (e) e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    onCancel={(e) => {
                      if (e) e.stopPropagation();
                    }}
                    okText="Yes"
                    cancelText="No"
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity z-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </Popconfirm>
                )}
              </div>
            ),
            className: 'group relative',
          }))}
        />
      </div>
    </div>
  );
};

export default ChatSidebar;