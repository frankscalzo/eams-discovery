import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { useBffAuth } from '../contexts/BffAuthContext';

const BffLogin = () => {
  const { login } = useBffAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError('');
      await login();
    } catch (error) {
      setError(error.message || 'Login failed');
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
            Click the button below to sign in with your AWS Cognito account.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleLogin}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
              sx={{ minWidth: 200 }}
            >
              {isLoading ? 'Signing In...' : 'Sign In with Cognito'}
            </Button>
          </Box>

          <Typography variant="caption" display="block" align="center" sx={{ mt: 2 }}>
            You will be redirected to AWS Cognito for authentication
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default BffLogin;
