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
    // Check for existing authentication
    const checkAuth = () => {
      try {
        const currentUser = localStorage.getItem('eams_user');
        if (currentUser) {
          const userData = JSON.parse(currentUser);
          setIsAuthenticated(true);
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const login = async (usernameOrEmail, password) => {
    try {
      // Mock authentication - check against demo credentials
      const validCredentials = [
        { username: 'fscalzo', email: 'fscalzo@optimumhit.com', password: 'Babymakes7!' },
        { username: 'admin', email: 'admin@optimumhit.com', password: 'admin123' },
        { username: 'user', email: 'user@optimumhit.com', password: 'user123' }
      ];

      const validUser = validCredentials.find(
        cred => (cred.username === usernameOrEmail || cred.email === usernameOrEmail) && cred.password === password
      );

      if (validUser) {
        const userData = {
          id: validUser.username,
          username: validUser.username,
          email: validUser.email,
          firstName: validUser.username === 'fscalzo' ? 'Frank' : validUser.username === 'admin' ? 'Admin' : 'User',
          lastName: validUser.username === 'fscalzo' ? 'Scalzo' : validUser.username === 'admin' ? 'User' : 'Test',
          userType: validUser.username === 'admin' ? 'Admin' : 'Internal',
          assignedProjects: ['proj1', 'proj2', 'proj3'],
          companyId: 'comp1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Store user data
        localStorage.setItem('eams_user', JSON.stringify(userData));
        
        setIsAuthenticated(true);
        setUser(userData);
        return true;
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    localStorage.removeItem('eams_user');
    localStorage.removeItem('eams_tokens');
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