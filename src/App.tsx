import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { App as AntApp, Layout } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Login from './pages/Login';
import Chat from './pages/Chat';
import AdminDashboard from './pages/AdminDashboard';
import Unauthorized from './pages/Unauthorized';
import './App.css';

const { Content } = Layout;

function App() {
  return (
    <AuthProvider>
      <AntApp>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Header />
                    <Content>
                      <Routes>
                        <Route path="/chat" element={<Chat />} />
                        <Route path="/chat/:chatId" element={<Chat />} />
                        <Route 
                          path="/admin" 
                          element={
                            <ProtectedRoute requireAdmin>
                              <AdminDashboard />
                            </ProtectedRoute>
                          } 
                        />
                        <Route path="/unauthorized" element={<Unauthorized />} />
                        <Route path="/" element={<Chat />} />
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
}

export default App;