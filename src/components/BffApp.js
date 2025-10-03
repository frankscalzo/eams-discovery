import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BffAuthProvider, useBffAuth } from '../contexts/BffAuthContext';
import BffLogin from './BffLogin';
import BffDashboard from './BffDashboard';
import { CircularProgress, Box } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const AppContent = () => {
  const { isAuthenticated, isLoading } = useBffAuth();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? <BffDashboard /> : <BffLogin />;
};

const BffApp = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BffAuthProvider>
        <AppContent />
      </BffAuthProvider>
    </ThemeProvider>
  );
};

export default BffApp;
