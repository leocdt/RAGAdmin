import React from 'react';
import { App as AntApp, Layout } from 'antd';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Chat from './pages/Chat';
import InsertData from './pages/InsertData';
import Documents from './pages/Documents';
import Header from './components/Header';
import './scss/main.scss';

const { Content } = Layout;

const App: React.FC = () => {
  return (
    <AntApp>
      <Router>
        <Layout className="min-h-screen">
          <Header />
          <Content className="ant-layout-content">
            <Routes>
              <Route path="/" element={<Chat />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:chatId" element={<Chat />} />
              <Route path="/insert-data" element={<InsertData />} />
              <Route path="/documents" element={<Documents />} />
            </Routes>
          </Content>
        </Layout>
      </Router>
    </AntApp>
  );
};

export default App;