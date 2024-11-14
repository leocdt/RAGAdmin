import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { MessageSquare, Upload, FileText } from 'lucide-react';
import RAGAdminLogo from '../resources/Image/RAGAdmin3.png';

const { Header: AntHeader } = Layout;

const Header: React.FC = () => {
  const location = useLocation();
  const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';

  const menuItems = [
    { key: '/chat', icon: <MessageSquare size={16} />, label: 'Chat' },
    { key: '/insert-data', icon: <Upload size={16} />, label: 'Import Data' },
    { key: '/documents', icon: <FileText size={16} />, label: 'Documents' },
  ];

  return (
    <AntHeader className={`shadow-md ${isDarkTheme ? 'bg-[#1f1f1f]' : 'bg-white'}`}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center">
          <img src={RAGAdminLogo} alt="RAGAdmin Logo" className="h-14 mr-2" />
          <span className="text-xl font-bold site-title">
            RAGAdmin
          </span>
        </Link>
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems.map((item) => ({
            ...item,
            label: <Link to={item.key}>{item.label}</Link>,
          }))}
          className="border-0 flex-nowrap space-x-2"
        />
      </div>
    </AntHeader>
  );
};

export default Header;