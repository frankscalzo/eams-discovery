import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import Login from './components/Login';
import PasswordReset from './components/PasswordReset';
import ProjectSelector from './components/ProjectSelector';
import Dashboard from './components/Dashboard';
import ApplicationForm from './components/ApplicationForm';
import ApplicationList from './components/ApplicationList';
import DependencyMap from './components/DependencyMap';
import CostMonitoring from './components/CostMonitoring';
import EAMSDashboard from './components/EAMSDashboard';
import CompanyDashboard from './components/CompanyDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

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

// Project-specific route wrapper
const ProjectRoute = ({ children }) => {
  const { projectId } = useParams();
  return <ProjectProvider projectId={projectId}>{children}</ProjectProvider>;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/password-reset" element={<PasswordReset />} />
            <Route path="/companies" element={<ProtectedRoute><CompanyDashboard /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><ProjectSelector /></ProtectedRoute>} />
            <Route path="/projects/:projectId" element={
              <ProtectedRoute>
                <ProjectRoute>
                  <Layout />
                </ProjectRoute>
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="applications" element={<ApplicationList />} />
              <Route path="applications/new" element={<ApplicationForm />} />
              <Route path="applications/:id" element={<ApplicationForm />} />
              <Route path="dependencies" element={<DependencyMap />} />
              <Route path="costs" element={<CostMonitoring />} />
              <Route path="eams" element={<EAMSDashboard />} />
            </Route>
            <Route path="/" element={<Navigate to="/projects" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
