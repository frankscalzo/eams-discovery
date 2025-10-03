import React, { createContext, useContext, useState, useEffect } from 'react';
import bffApiService from '../services/bffApiService';

const BffAuthContext = createContext();

export const useBffAuth = () => {
  const context = useContext(BffAuthContext);
  if (!context) {
    throw new Error('useBffAuth must be used within a BffAuthProvider');
  }
  return context;
};

export const BffAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      // Try to fetch users to check if we're authenticated
      const response = await bffApiService.getUsers();
      
      if (response.success && response.users) {
        // For now, use the first user as the current user
        // In a real app, you'd have a dedicated /me endpoint
        setUser(response.users[0] || { email: 'user@example.com' });
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.log('Not authenticated:', error.message);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      // Redirect to our BFF auth endpoint
      await bffApiService.login();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await bffApiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      // Redirect to login page
      window.location.href = '/login';
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth
  };

  return (
    <BffAuthContext.Provider value={value}>
      {children}
    </BffAuthContext.Provider>
  );
};
