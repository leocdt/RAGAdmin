import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import Header from './components/Header';
import Chat from './pages/Chat';
import InsertData from './pages/InsertData';
import Documents from './pages/Documents';

const { Content } = Layout;

function App() {
  return (
    <Router>
      <Layout className="min-h-screen">
        <Header />
        <Content>
          <Routes>
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:chatId" element={<Chat />} />
            <Route path="/insert-data" element={<InsertData />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/" element={<Navigate to="/chat" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Router>
  );
}

export default App;