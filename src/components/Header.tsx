import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import { MessageSquare, Upload, FileText, Users, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import RAGAdminLogo from '../resources/Image/RAGAdmin3.png';
import ThemeToggle from './ThemeToggle';

const { Header: AntHeader } = Layout;

const Header: React.FC = () => {
  const location = useLocation();
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { key: '/chat', icon: <MessageSquare size={16} />, label: 'Chat' },
    ...(isAdmin ? [
      { key: '/insert-data', icon: <Upload size={16} />, label: 'Import Data' },
      { key: '/admin', icon: <Users size={16} />, label: 'User Management' },
    ] : []),
    { key: '/documents', icon: <FileText size={16} />, label: 'Documents' },
  ];

  return (
    <AntHeader className={`shadow-md ${isDarkTheme ? 'bg-[#1f1f1f]' : 'bg-white'}`}>
      <div className="grid grid-cols-3 items-center max-w-10xl mx-auto">
        <ThemeToggle className="ml-[-40px]"/>
        <Link to="/" className="flex items-center justify-center ml-[-200px]">
          <img src={RAGAdminLogo} alt="RAGAdmin Logo" className="h-14 mr-2" />
          <span className="text-xl font-bold site-title">
            RAGAdmin
          </span>
        </Link>
        <div className="flex items-center justify-end">
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems.map((item) => ({
              ...item,
              label: <Link to={item.key}>{item.label}</Link>,
            }))}
            className="border-0 flex-nowrap space-x-2 mr-4"
          />
          <Button
            icon={<LogOut size={16} />}
            onClick={handleLogout}
            className="ml-4"
          >
            Logout
          </Button>
        </div>
      </div>
    </AntHeader>
  );
};

export default Header;