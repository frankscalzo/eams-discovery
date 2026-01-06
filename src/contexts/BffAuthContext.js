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
      // Check if there's a valid session by calling the API
      const result = await bffApiService.getUsers();
      if (result.success) {
        // If API call succeeds, user is authenticated
        const storedUser = localStorage.getItem('eams_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
        }
      } else {
        // API call failed, user is not authenticated
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('eams_user');
        localStorage.removeItem('eams_tokens');
      }
    } catch (error) {
      console.log('Not authenticated:', error.message);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('eams_user');
      localStorage.removeItem('eams_tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      console.log('BffAuthContext: Starting login for:', username);
      // Use real API Gateway authentication
      const result = await bffApiService.login(username, password);
      console.log('BffAuthContext: API login response:', result);
      
      if (result && result.success) {
        const userData = {
          id: result.user.sub,
          email: result.user.email,
          name: result.user.name,
          userType: result.user.userType || 'admin',
          companyId: result.user.companyId
        };
        
        console.log('BffAuthContext: Storing user data:', userData);
        localStorage.setItem('eams_user', JSON.stringify(userData));
        localStorage.setItem('eams_tokens', JSON.stringify({
          accessToken: result.accessToken,
          idToken: result.idToken,
          refreshToken: result.refreshToken
        }));
        
        setUser(userData);
        setIsAuthenticated(true);
        console.log('BffAuthContext: Login successful, user authenticated');
        
        return { success: true, user: userData };
      } else {
        const errorMsg = result?.message || 'Login failed: Invalid response';
        console.error('BffAuthContext: Login failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('BffAuthContext: Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call API Gateway logout
      await bffApiService.logout();
    } catch (error) {
      console.error('API logout error:', error);
      // Continue with local logout even if API call fails
    } finally {
      // Clear local storage
      localStorage.removeItem('eams_user');
      localStorage.removeItem('eams_tokens');
      localStorage.removeItem('eams_session');
      
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
