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
  onChatsReorder?: (newChats: ChatSession[]) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ chats, onNewChat, onDeleteChat, currentChatId, onChatsReorder }) => {
  const [draggedItem, setDraggedItem] = React.useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedItem(null);
    e.currentTarget.classList.remove('dragging');
    // Remove drag-over class from all items
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem === null) return;

    const draggedOverItem = chats[index];
    if (!draggedOverItem) return;

    // Remove drag-over class from all items first
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
    // Add drag-over class to current target
    e.currentTarget.classList.add('drag-over');

    if (draggedItem !== index) {
      const items = [...chats];
      const draggedItemContent = items[draggedItem];
      items.splice(draggedItem, 1);
      items.splice(index, 0, draggedItemContent);

      if (onChatsReorder) {
        onChatsReorder(items);
      }
      setDraggedItem(index);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only remove the class if we're leaving the actual target, not its children
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      e.currentTarget.classList.remove('drag-over');
    }
  };

  return (
    <div className="w-64 bg-white border-r h-full flex flex-col">
      <div className="p-4 border-b bg-white">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-[#1677ff] text-white px-4 py-2 rounded hover:bg-[#0958d9] btn-new-chat"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Menu
          mode="inline"
          selectedKeys={currentChatId ? [currentChatId] : []}
          items={chats.map((chat, index) => ({
            key: chat.id,
            icon: <MessageSquare size={16} />,
            label: (
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className="flex items-center justify-between w-full pr-2 cursor-move group"
                style={{ touchAction: 'none' }}
              >
                <Link 
                  to={`/chat/${chat.id}`} 
                  className="flex-1 truncate"
                  onClick={(e) => e.stopPropagation()}
                  draggable={false}
                >
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
                      draggable={false}
                    >
                      <Trash2 size={16} />
                    </button>
                  </Popconfirm>
                )}
              </div>
            ),
            className: `group relative ${draggedItem === index ? 'dragging' : ''}`,
          }))}
        />
      </div>
      <style>
        {`
          .dragging {
            opacity: 0.5;
            background: #f5f5f5;
          }
          .drag-over {
            border-top: 2px solid #1677ff;
          }
          [draggable] {
            user-select: none;
            -webkit-user-drag: element;
          }
          .ant-menu-item:hover {
            cursor: move;
          }
        `}
      </style>
    </div>
  );
};

export default ChatSidebar;