import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert,
  TextField
} from '@mui/material';
import { useBffAuth } from '../contexts/BffAuthContext';

const BffLogin = () => {
  const { login, isAuthenticated } = useBffAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      console.log('BffLogin: Starting login for:', username);
      
      const result = await login(username, password);
      console.log('BffLogin: Login result:', result);
      
      if (result && result.success) {
        console.log('BffLogin: Login successful, redirecting to dashboard');
        setIsLoading(false);
        // Use window.location for a hard redirect to ensure it works
        window.location.href = '/dashboard';
      } else {
        throw new Error('Login failed: Invalid response from server');
      }
    } catch (error) {
      console.error('BffLogin: Login error:', error);
      setError(error.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            EAMS Login
          </Typography>
          
          <Typography variant="body1" align="center" color="textSecondary" paragraph>
            Enter your credentials to sign in to EAMS.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin} sx={{ mt: 3 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username or Email"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
              sx={{ minWidth: 200 }}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </Box>

          <Typography variant="caption" display="block" align="center" sx={{ mt: 2 }}>
            Test Credentials: admin@optimumcloudservices.com / AdminPass123!
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default BffLogin;
