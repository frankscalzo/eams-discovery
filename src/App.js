import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import Login from './components/Login';
import PasswordReset from './components/PasswordReset';
import EnhancedPasswordReset from './components/EnhancedPasswordReset';
import RootDashboard from './components/RootDashboard';
import CompanyDashboard from './components/CompanyDashboard';
import UserManagement from './components/UserManagement';
import EnhancedUserForm from './components/EnhancedUserForm';
import EnhancedDashboard from './components/EnhancedDashboard';
import ProjectDiscovery from './components/ProjectDiscovery';
import EAMSProjectSelector from './components/EAMSProjectSelector';
import EAMSProjectDashboard from './components/EAMSProjectDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import BackButton from './components/BackButton';
import MainNavigation from './components/MainNavigation';

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


function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Router>
            <MainNavigation />
            <Box sx={{ mt: 8 }}>
              <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/password-reset" element={<PasswordReset />} />
              <Route path="/enhanced-password-reset" element={<EnhancedPasswordReset />} />
              <Route path="/dashboard" element={<ProtectedRoute><EnhancedDashboard /></ProtectedRoute>} />
              <Route path="/legacy-dashboard" element={<ProtectedRoute><RootDashboard /></ProtectedRoute>} />
              <Route path="/companies" element={<ProtectedRoute><CompanyDashboard /></ProtectedRoute>} />
              <Route path="/companies/new" element={<ProtectedRoute><CompanyDashboard /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
              <Route path="/users/new" element={<ProtectedRoute><EnhancedUserForm /></ProtectedRoute>} />
              <Route path="/users/:userId/edit" element={<ProtectedRoute><EnhancedUserForm /></ProtectedRoute>} />
                      <Route path="/projects" element={<ProtectedRoute><ProjectDiscovery /></ProtectedRoute>} />
                      <Route path="/projects/:projectId" element={<ProtectedRoute><EAMSProjectDashboard /></ProtectedRoute>} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Box>
          </Router>
        </ThemeProvider>
      </ProjectProvider>
    </AuthProvider>
  );
}

export default App;
