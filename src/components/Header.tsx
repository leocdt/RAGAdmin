import React from 'react';
import { Layout, Menu, Button, Switch, theme, Image } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BulbOutlined } from '@ant-design/icons';

const { Header: AntHeader } = Layout;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, logout } = useAuth();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  console.log('Header isAdmin:', isAdmin);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/chat')) return 'chat';
    if (path.startsWith('/documents')) return 'documents';
    if (path.startsWith('/admin')) return 'admin';
    return '';
  };

  const toggleTheme = () => {
    const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
  };

  const menuItems = [
    { key: 'chat', label: 'Chat', path: '/chat' },
  ];

  if (isAdmin) {
    console.log('Adding admin menu items');
    menuItems.push(
      { key: 'documents', label: 'Import Data', path: '/documents' },
      { key: 'admin', label: 'User Management', path: '/admin' }
    );
  } else {
    menuItems.push({ key: 'documents', label: 'Documents', path: '/documents' });
  }

  return (
    <AntHeader style={{ 
      background: colorBgContainer, 
      padding: '0 16px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Image
          src="/logo.png"
          alt="RAGAdmin Logo"
          style={{ height: '40px', marginRight: '24px' }}
          preview={false}
        />
        <Menu
          mode="horizontal"
          selectedKeys={[getSelectedKey()]}
          items={menuItems.map(item => ({
            key: item.key,
            label: item.label,
            onClick: () => navigate(item.path),
          }))}
          style={{ flex: 1, minWidth: 'auto' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Switch
          checkedChildren={<BulbOutlined />}
          unCheckedChildren={<BulbOutlined />}
          onChange={toggleTheme}
          defaultChecked={document.body.getAttribute('data-theme') === 'dark'}
        />
        <Button onClick={handleLogout}>Logout</Button>
      </div>
    </AntHeader>
  );
};

export default Header;