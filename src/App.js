import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import { BffAuthProvider, useBffAuth } from './contexts/BffAuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import BffLogin from './components/BffLogin';
import BffDashboard from './components/BffDashboard';
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
import ThirdPartyAppsRepository from './components/ThirdPartyAppsRepository';
import CoTravelersRepository from './components/CoTravelersRepository';
import DataImporter from './components/DataImporter';
import SettingsPage from './components/SettingsPage';
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


function AppContent() {
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useBffAuth();
  
  const isAuthPage = location.pathname === '/login' || 
                    location.pathname === '/password-reset' || 
                    location.pathname === '/enhanced-password-reset';
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <>
      <MainNavigation />
      <Box sx={{ mt: (!user || isAuthPage) ? 0 : 8 }}>
              <Routes>
              <Route path="/login" element={<BffLogin />} />
              <Route path="/password-reset" element={<PasswordReset />} />
              <Route path="/enhanced-password-reset" element={<EnhancedPasswordReset />} />
              <Route path="/dashboard" element={<ProtectedRoute><BffDashboard /></ProtectedRoute>} />
              <Route path="/legacy-dashboard" element={<ProtectedRoute><RootDashboard /></ProtectedRoute>} />
              <Route path="/companies" element={<ProtectedRoute><CompanyDashboard /></ProtectedRoute>} />
              <Route path="/companies/new" element={<ProtectedRoute><CompanyDashboard /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
              <Route path="/users/new" element={<ProtectedRoute><EnhancedUserForm /></ProtectedRoute>} />
              <Route path="/users/:userId/edit" element={<ProtectedRoute><EnhancedUserForm /></ProtectedRoute>} />
                      <Route path="/projects" element={<ProtectedRoute><ProjectDiscovery /></ProtectedRoute>} />
                      <Route path="/projects/:projectId" element={<ProtectedRoute><EAMSProjectDashboard /></ProtectedRoute>} />
            <Route path="/third-party-apps" element={<ProtectedRoute><ThirdPartyAppsRepository /></ProtectedRoute>} />
            <Route path="/co-travelers" element={<ProtectedRoute><CoTravelersRepository /></ProtectedRoute>} />
            <Route path="/data-importer" element={<ProtectedRoute><DataImporter /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
              </Routes>
      </Box>
    </>
  );
}

function App() {
  return (
    <BffAuthProvider>
      <ProjectProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Router>
            <AppContent />
          </Router>
        </ThemeProvider>
      </ProjectProvider>
    </BffAuthProvider>
  );
}

export default App;
