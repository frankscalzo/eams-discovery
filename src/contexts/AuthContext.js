import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, LinearProgress } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { USER_TYPES, USER_ROLES } from '../constants/userTypes';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Idle Warning Dialog Component
const IdleWarningDialog = ({ countdown, onContinue, onLogout }) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (countdown / 120) * 100; // 120 seconds = 2 minutes

  return (
    <Dialog
      open={true}
      disableEscapeKeyDown
      disableBackdropClick
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        Session Timeout Warning
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          You have been idle for 30 minutes. Your session will automatically log out in:
        </Typography>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="h4" color="error" sx={{ fontWeight: 'bold' }}>
            {formatTime(countdown)}
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ height: 8, borderRadius: 4 }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
          Click "Continue Session" to stay logged in, or "Logout Now" to end your session.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={onContinue}
          size="large"
        >
          Continue Session
        </Button>
        <Button 
          variant="outlined" 
          color="error" 
          onClick={onLogout}
          size="large"
        >
          Logout Now
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleWarningCountdown, setIdleWarningCountdown] = useState(0);
  
  // Session timeout constants
  const MAX_SESSION_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
  const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
  const WARNING_DURATION = 2 * 60 * 1000; // 2 minutes warning before logout
  
  // Refs for timeout management
  const idleTimeoutRef = useRef(null);
  const sessionTimeoutRef = useRef(null);
  const warningCountdownRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Clear all timeouts
  const clearAllTimeouts = () => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    if (warningCountdownRef.current) {
      clearInterval(warningCountdownRef.current);
      warningCountdownRef.current = null;
    }
  };

  // Start session timeout (1 hour max)
  const startSessionTimeout = () => {
    clearAllTimeouts();
    sessionTimeoutRef.current = setTimeout(() => {
      console.log('Session expired after 1 hour');
      logout();
    }, MAX_SESSION_DURATION);
  };

  // Start idle timeout (30 minutes)
  const startIdleTimeout = () => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    idleTimeoutRef.current = setTimeout(() => {
      console.log('User idle for 30 minutes, showing warning');
      setShowIdleWarning(true);
      setIdleWarningCountdown(WARNING_DURATION / 1000); // Convert to seconds
      startWarningCountdown();
    }, IDLE_TIMEOUT);
  };

  // Start warning countdown
  const startWarningCountdown = () => {
    warningCountdownRef.current = setInterval(() => {
      setIdleWarningCountdown(prev => {
        if (prev <= 1) {
          console.log('Idle warning countdown expired, logging out');
          logout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Reset idle timer on user activity
  const resetIdleTimer = () => {
    lastActivityRef.current = Date.now();
    if (isAuthenticated) {
      startIdleTimeout();
    }
  };

  // Handle user activity
  const handleUserActivity = () => {
    if (showIdleWarning) {
      // User is active during warning, cancel logout
      setShowIdleWarning(false);
      setIdleWarningCountdown(0);
      clearInterval(warningCountdownRef.current);
      warningCountdownRef.current = null;
      resetIdleTimer();
    } else {
      resetIdleTimer();
    }
  };

  // Continue session (user clicked continue)
  const continueSession = () => {
    setShowIdleWarning(false);
    setIdleWarningCountdown(0);
    clearInterval(warningCountdownRef.current);
    warningCountdownRef.current = null;
    resetIdleTimer();
  };

  // Set up activity listeners
  useEffect(() => {
    if (isAuthenticated) {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      events.forEach(event => {
        document.addEventListener(event, handleUserActivity, true);
      });

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleUserActivity, true);
        });
      };
    }
  }, [isAuthenticated, showIdleWarning]);

  useEffect(() => {
    // Check for existing authentication with lenient validation
    const checkAuth = async () => {
      try {
        const currentUser = localStorage.getItem('eams_user');
        const tokens = localStorage.getItem('eams_tokens');
        
        if (currentUser) {
          const userData = JSON.parse(currentUser);
          
          // If we have user data, stay logged in - be very permissive
          setIsAuthenticated(true);
          setUser(userData);
          startSessionTimeout();
          startIdleTimeout();
        } else {
          // No user data, not authenticated
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Only clear if there's a critical error, otherwise keep user logged in
        if (error.message && error.message.includes('Invalid JSON')) {
          localStorage.removeItem('eams_user');
          localStorage.removeItem('eams_tokens');
          setIsAuthenticated(false);
          setUser(null);
        } else {
          // For other errors, try to keep user logged in
          const currentUser = localStorage.getItem('eams_user');
          if (currentUser) {
            try {
              const userData = JSON.parse(currentUser);
              setIsAuthenticated(true);
              setUser(userData);
            } catch (parseError) {
              setIsAuthenticated(false);
              setUser(null);
            }
          } else {
            setIsAuthenticated(false);
            setUser(null);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Validate JWT token expiration
  const validateToken = async (token) => {
    try {
      // Decode JWT token to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Check if token is expired
      if (payload.exp && payload.exp < currentTime) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  const login = async (usernameOrEmail, password) => {
    try {
      // Try AWS Cognito first
      try {
        const { CognitoUserPool, AuthenticationDetails, CognitoUser } = await import('amazon-cognito-identity-js');
        
        // Get Cognito configuration from environment variables
        const userPoolId = process.env.REACT_APP_USER_POOL_ID;
        const clientId = process.env.REACT_APP_USER_POOL_CLIENT_ID;
        
        if (!userPoolId || !clientId) {
          throw new Error('Cognito configuration not found in environment variables');
        }
        
        const poolData = {
          UserPoolId: userPoolId,
          ClientId: clientId
        };
        
        const userPool = new CognitoUserPool(poolData);
        const authenticationData = {
          Username: usernameOrEmail,
          Password: password,
        };
        
        const authenticationDetails = new AuthenticationDetails(authenticationData);
        const userData = {
          Username: usernameOrEmail,
          Pool: userPool
        };
        
        const cognitoUser = new CognitoUser(userData);
        
        return new Promise((resolve, reject) => {
          cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: (result) => {
              const accessToken = result.getAccessToken().getJwtToken();
              const idToken = result.getIdToken().getJwtToken();
              const refreshToken = result.getRefreshToken().getToken();
              
              const userData = {
                id: usernameOrEmail,
                username: usernameOrEmail,
                email: usernameOrEmail,
                firstName: 'Admin',
                lastName: 'User',
                userType: USER_TYPES.PRIMARY_ADMIN,
                userRole: USER_ROLES[USER_TYPES.PRIMARY_ADMIN],
                assignedCompanyId: 'primary-company',
                assignedCompanyName: 'Optimum Cloud Services',
                isPrimaryCompany: true,
                assignedProjects: ['proj1', 'proj2', 'proj3'],
                permissions: USER_ROLES[USER_TYPES.PRIMARY_ADMIN].permissions,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                tokens: {
                  accessToken,
                  idToken,
                  refreshToken
                }
              };
              
              // Store user data and tokens
              localStorage.setItem('eams_user', JSON.stringify(userData));
              localStorage.setItem('eams_tokens', JSON.stringify({ accessToken, idToken, refreshToken }));
              
              setIsAuthenticated(true);
              setUser(userData);
              startSessionTimeout();
              startIdleTimeout();
              resolve(true);
            },
            onFailure: (err) => {
              console.error('Cognito login error:', err);
              // Fall back to mock authentication
              fallbackLogin(usernameOrEmail, password, resolve, reject);
            }
          });
        });
      } catch (cognitoError) {
        console.error('Cognito setup error:', cognitoError);
        // Fall back to mock authentication
        return new Promise((resolve, reject) => {
          fallbackLogin(usernameOrEmail, password, resolve, reject);
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const fallbackLogin = (usernameOrEmail, password, resolve, reject) => {
    // Fallback authentication for development
    const validCredentials = [
      { username: 'admin@optimumcloudservices.com', password: 'AdminPass123!' },
      { username: 'fscalzo', email: 'fscalzo@optimumhit.com', password: 'Babymakes7!' }
    ];

    const validUser = validCredentials.find(
      cred => (cred.username === usernameOrEmail || cred.email === usernameOrEmail) && cred.password === password
    );

    if (validUser) {
      const userData = {
        id: usernameOrEmail,
        username: usernameOrEmail,
        email: usernameOrEmail,
        firstName: usernameOrEmail === 'fscalzo' ? 'Frank' : 'Admin',
        lastName: usernameOrEmail === 'fscalzo' ? 'Scalzo' : 'User',
        userType: USER_TYPES.PRIMARY_ADMIN,
        userRole: USER_ROLES[USER_TYPES.PRIMARY_ADMIN],
        assignedCompanyId: 'primary-company',
        assignedCompanyName: 'Optimum Cloud Services',
        isPrimaryCompany: true,
        assignedProjects: ['proj1', 'proj2', 'proj3'],
        permissions: USER_ROLES[USER_TYPES.PRIMARY_ADMIN].permissions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store user data
      localStorage.setItem('eams_user', JSON.stringify(userData));
      
      setIsAuthenticated(true);
      setUser(userData);
      startSessionTimeout();
      startIdleTimeout();
      resolve(true);
    } else {
      reject(new Error('Invalid credentials'));
    }
  };

  const logout = async () => {
    // Clear all timeouts
    clearAllTimeouts();
    
    // Clear warning state
    setShowIdleWarning(false);
    setIdleWarningCountdown(0);
    
    // Clear all authentication data
    localStorage.removeItem('eams_user');
    localStorage.removeItem('eams_tokens');
    localStorage.removeItem('eams_session');
    localStorage.removeItem('cognito_user');
    localStorage.removeItem('cognito_tokens');
    
    // Clear any other potential auth storage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('eams_') || key.startsWith('cognito_')) {
        localStorage.removeItem(key);
      }
    });
    
    setIsAuthenticated(false);
    setUser(null);
  };

  // Force logout and clear all data
  const forceLogout = async () => {
    await logout();
    // Reload the page to ensure clean state
    window.location.reload();
  };

  // Permission checking methods
  const hasPermission = (permission) => {
    if (!user) return false;
    return user.permissions && user.permissions.includes(permission);
  };

  const canManageUsers = () => {
    if (!user) return false;
    return user.userRole && user.userRole.canManageUsers;
  };

  const canManageCompanies = () => {
    if (!user) return false;
    return user.userRole && user.userRole.canManageCompanies;
  };

  const canAccessAllCompanies = () => {
    if (!user) return false;
    return user.userRole && user.userRole.canAccessAllCompanies;
  };

  const isPrimaryCompany = () => {
    if (!user) return false;
    return user.isPrimaryCompany === true;
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    forceLogout,
    hasPermission,
    canManageUsers,
    canManageCompanies,
    canAccessAllCompanies,
    isPrimaryCompany,
    showIdleWarning,
    idleWarningCountdown,
    continueSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showIdleWarning && (
        <IdleWarningDialog
          countdown={idleWarningCountdown}
          onContinue={continueSession}
          onLogout={logout}
        />
      )}
    </AuthContext.Provider>
  );
};