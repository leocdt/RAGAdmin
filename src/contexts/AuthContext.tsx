import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  username: string;
  login: (token: string, role: string, username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    const savedUsername = localStorage.getItem('username');
    if (token) {
      setIsAuthenticated(true);
      setIsAdmin(role === 'admin');
      setUsername(savedUsername || '');
      console.log('Current role:', role); // Pour le débogage
    }
  }, []);

  const login = (token: string, role: string, username: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', role);
    localStorage.setItem('username', username);
    setIsAuthenticated(true);
    setIsAdmin(role === 'admin');
    setUsername(username);
    console.log('Login with role:', role); // Pour le débogage
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUsername('');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 