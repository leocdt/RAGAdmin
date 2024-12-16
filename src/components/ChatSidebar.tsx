import React from 'react';
import { Menu } from 'antd';
import { MessageSquare, Plus } from 'lucide-react';
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
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ chats, onNewChat, currentChatId }) => {
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
          label: <Link to={`/chat/${chat.id}`}>{chat.title}</Link>,
        }))}
      />
    </div>
  );
};

export default ChatSidebar;