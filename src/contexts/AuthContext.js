import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate authentication check
    setTimeout(() => {
      setLoading(false);
      // For now, always show as authenticated for demo purposes
      setIsAuthenticated(true);
      setUser({ id: '1', email: 'demo@example.com', name: 'Demo User' });
    }, 1000);
  }, []);

  const login = async (email, password) => {
    // Placeholder login function
    setIsAuthenticated(true);
    setUser({ id: '1', email, name: 'Demo User' });
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};