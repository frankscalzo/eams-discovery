import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Container,
  Paper,
  Divider,
  Link
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { Button as KendoButton } from '@progress/kendo-react-buttons';
import { TextBox } from '@progress/kendo-react-inputs';
import { Card as KendoCard } from '@progress/kendo-react-layout';
import { Notification } from '@progress/kendo-react-notification';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="eams-header">
      <div className="eams-container">
        <div className="eams-title">EAMS</div>
        <div className="eams-subtitle">Enterprise Architecture Management System</div>
      </div>
      
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <KendoCard className="eams-card fade-in">
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h5" component="h2" gutterBottom color="primary">
                Welcome Back
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Sign in to access your EAMS dashboard
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <Box sx={{ mb: 2 }}>
                <TextBox
                  label="Username or Email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ width: '100%' }}
                  placeholder="Enter your username or email"
                />
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <TextBox
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: '100%' }}
                  placeholder="Enter your password"
                />
              </Box>
              
              <KendoButton
                type="submit"
                themeColor="primary"
                size="large"
                style={{ width: '100%', height: '48px' }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign In'}
              </KendoButton>
            </Box>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/password-reset')}
                sx={{ mb: 2, display: 'block', color: 'primary.main' }}
              >
                Forgot your password?
              </Link>
              <Typography variant="body2" color="text.secondary">
                Your Credentials: fscalzo or fscalzo@optimumhit.com / Babymakes7!
              </Typography>
            </Box>
          </KendoCard>
        </Box>
      </Container>
    </div>
  );
};

export default Login;