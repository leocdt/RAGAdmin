import React from 'react';
import { App as AntApp, Layout } from 'antd';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Chat from './pages/Chat';
import InsertData from './pages/InsertData';
import Documents from './pages/Documents';
import AdminDashboard from './pages/AdminDashboard';
import Unauthorized from './pages/Unauthorized';
import Header from './components/Header';
import './scss/main.scss';

const { Content } = Layout;

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AntApp>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout className="min-h-screen">
                    <Header />
                    <Content className="ant-layout-content">
                      <Routes>
                        <Route path="/" element={<Chat />} />
                        <Route path="/chat" element={<Chat />} />
                        <Route path="/chat/:chatId" element={<Chat />} />
                        <Route 
                          path="/insert-data" 
                          element={
                            <ProtectedRoute requireAdmin>
                              <InsertData />
                            </ProtectedRoute>
                          } 
                        />
                        <Route path="/documents" element={<Documents />} />
                        <Route 
                          path="/admin" 
                          element={
                            <ProtectedRoute requireAdmin>
                              <AdminDashboard />
                            </ProtectedRoute>
                          } 
                        />
                        <Route path="/unauthorized" element={<Unauthorized />} />
                      </Routes>
                    </Content>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AntApp>
    </AuthProvider>
  );
};

export default App;