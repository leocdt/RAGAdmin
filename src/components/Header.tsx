import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { MessageSquare, Upload, FileText } from 'lucide-react';

const { Header: AntHeader } = Layout;

const Header: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { key: '/chat', icon: <MessageSquare size={16} />, label: 'Chat' },
    { key: '/insert-data', icon: <Upload size={16} />, label: 'Import Data' },
    { key: '/documents', icon: <FileText size={16} />, label: 'Documents' },
  ];

  return (
    <AntHeader className="bg-white shadow-md">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center">
          <MessageSquare className="text-green-500 mr-2" size={24} />
          <span className="text-xl font-bold text-gray-800">RAGAdmin</span>
        </Link>
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems.map((item) => ({
            ...item,
            label: <Link to={item.key}>{item.label}</Link>,
          }))}
          className="border-0"
        />
      </div>
    </AntHeader>
  );
};

export default Header;