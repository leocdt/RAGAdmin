import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import Header from './components/Header';
import Chat from './pages/Chat';
import InsertData from './pages/InsertData';
import Documents from './pages/Documents';
import ThemeToggle from './components/ThemeToggle';


const { Content } = Layout;

function App() {
  return (
    <Router>
      <Layout className="min-h-screen">
        <Header />
        <Content className="p-6">
          <Routes>
            <Route path="/chat" element={<Chat />} />
            <Route path="/insert-data" element={<InsertData />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/" element={<Navigate to="/chat" replace />} />
          </Routes>
        </Content>
        <ThemeToggle className="absolute bottom-[25px] left-[25px]"/>
      </Layout>
    </Router>
  );
}

export default App;