import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import { ExitToApp as LogoutIcon } from '@mui/icons-material';
import { useBffAuth } from '../contexts/BffAuthContext';
import bffApiService from '../services/bffApiService';

const BffDashboard = () => {
  const { user, logout } = useBffAuth();
  const [data, setData] = useState({
    users: [],
    companies: [],
    projects: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');

      const [usersResult, companiesResult, projectsResult] = await Promise.all([
        bffApiService.getUsers().catch(err => ({ success: false, error: err.message })),
        bffApiService.getCompanies().catch(err => ({ success: false, error: err.message })),
        bffApiService.getProjects().catch(err => ({ success: false, error: err.message }))
      ]);

      setData({
        users: usersResult.success ? usersResult.users : [],
        companies: companiesResult.success ? companiesResult.companies : [],
        projects: projectsResult.success ? projectsResult.projects : []
      });

      if (!usersResult.success || !companiesResult.success || !projectsResult.success) {
        setError('Some data could not be loaded');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            EAMS Dashboard
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            Welcome, {user?.name || user?.email}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Users
                </Typography>
                <Typography variant="h3" color="primary">
                  {data.users.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total users in system
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Companies
                </Typography>
                <Typography variant="h3" color="primary">
                  {data.companies.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total companies
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Projects
                </Typography>
                <Typography variant="h3" color="primary">
                  {data.projects.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total projects
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4 }}>
          <Button 
            variant="contained" 
            onClick={loadData}
            disabled={isLoading}
          >
            Refresh Data
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default BffDashboard;
