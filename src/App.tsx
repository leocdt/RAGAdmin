import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { App as AntApp, Layout } from 'antd';
import Chat from './pages/Chat';
import InsertData from './pages/InsertData';
import Documents from './pages/Documents';
import './scss/main.scss';
import Header from './components/Header';

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