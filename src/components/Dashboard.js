import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  List as ListIcon,
  AccountTree as DependencyIcon,
  Assessment as ReportIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  MonetizationOn as CostIcon,
  Refresh as RefreshIcon,
  Upload as UploadIcon,
  TableChart as TableIcon
} from '@mui/icons-material';
import { useProject } from '../contexts/ProjectContext';
import mockAPI from '../services/mockAPI';
import CostMonitoring from './CostMonitoring';

const Dashboard = () => {
  const { currentProject, userRole, isAdmin } = useProject();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (currentProject?.id) {
      loadApplications();
    }
  }, [currentProject]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mockAPI.applications.getApplications(currentProject.id);
      setApplications(data);
    } catch (err) {
      console.error('Error loading applications:', err);
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'ready':
        return <CheckCircleIcon color="success" />;
      case 'in progress':
      case 'testing':
        return <SpeedIcon color="primary" />;
      case 'pending':
      case 'not started':
        return <WarningIcon color="warning" />;
      case 'failed':
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'ready':
        return 'success';
      case 'in progress':
      case 'testing':
        return 'primary';
      case 'pending':
      case 'not started':
        return 'warning';
      case 'failed':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getCriticalityColor = (criticality) => {
    switch (criticality?.toLowerCase()) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const quickActions = [
    {
      title: 'Add Application',
      description: 'Create a new application entry',
      icon: <AddIcon />,
      color: 'primary',
      onClick: () => navigate(`/projects/${currentProject?.id}/applications/new`)
    },
    {
      title: 'View Applications',
      description: 'Browse all applications',
      icon: <ListIcon />,
      color: 'secondary',
      onClick: () => navigate(`/projects/${currentProject?.id}/applications`)
    },
    {
      title: 'Bulk Upload',
      description: 'Import applications from CSV/Excel',
      icon: <UploadIcon />,
      color: 'info',
      onClick: () => navigate(`/projects/${currentProject?.id}/applications?upload=true`)
    },
    {
      title: 'Dependencies',
      description: 'Manage application dependencies',
      icon: <DependencyIcon />,
      color: 'warning',
      onClick: () => navigate(`/projects/${currentProject?.id}/dependencies`)
    },
    {
      title: 'EAMS Dashboard',
      description: 'Enterprise Architecture Management',
      icon: <TableIcon />,
      color: 'success',
      onClick: () => navigate(`/projects/${currentProject?.id}/eams`)
    },
    {
      title: 'View Costs',
      description: 'Monitor project costs',
      icon: <CostIcon />,
      color: 'error',
      onClick: () => navigate(`/projects/${currentProject?.id}/costs`)
    }
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {currentProject?.name || 'Project Dashboard'}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              {currentProject?.description || 'Manage your applications and dependencies'}
            </Typography>
          </Box>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip 
            label={`Role: ${userRole || 'User'}`} 
            color={isAdmin ? 'primary' : 'default'} 
            size="small" 
          />
          {currentProject?.budget && (
            <Chip 
              label={`Budget: $${currentProject.budget.toLocaleString()}`} 
              color="success" 
              size="small" 
            />
          )}
          <Chip 
            label={`Applications: ${applications.length}`} 
            color="info" 
            size="small" 
          />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Quick Actions */}
      <Grid container spacing={3} mb={4}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <Card 
              sx={{ 
                cursor: 'pointer', 
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { 
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
              onClick={action.onClick}
            >
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                <Box 
                  sx={{ 
                    p: 2, 
                    borderRadius: '50%', 
                    bgcolor: `${action.color}.light`, 
                    color: `${action.color}.contrastText`,
                    display: 'inline-flex',
                    mb: 1
                  }}
                >
                  {action.icon}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {action.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Statistics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <BusinessIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{applications.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Applications
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CheckCircleIcon color="success" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">
                    {applications.filter(app => app.TestPlanReady).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Test Plans Ready
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <SecurityIcon color="warning" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">
                    {applications.filter(app => app.EAMSData?.criticality === 'Critical').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Critical Applications
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUpIcon color="info" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">
                    {applications.length > 0 
                      ? Math.round(applications.reduce((sum, app) => sum + (app.Confidence || 0), 0) / applications.length)
                      : 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg. Confidence
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Applications */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Recent Applications
                </Typography>
                <Button 
                  size="small" 
                  onClick={() => navigate(`/projects/${currentProject?.id}/applications`)}
                >
                  View All
                </Button>
              </Box>
              
              {applications.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <BusinessIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No applications found
                  </Typography>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    Create your first application to get started with EAMS.
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<AddIcon />}
                    onClick={() => navigate(`/projects/${currentProject?.id}/applications/new`)}
                    sx={{ mt: 2 }}
                  >
                    Add Application
                  </Button>
                </Box>
              ) : (
                <List>
                  {applications.slice(0, 5).map((app, index) => (
                    <React.Fragment key={app.ApplicationID || index}>
                      <ListItem>
                        <ListItemIcon>
                          {getStatusIcon(app.TestingStatus)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle1">
                                {app.ApplicationName || 'Unnamed Application'}
                              </Typography>
                              {app.EAMSData?.criticality && (
                                <Chip 
                                  label={app.EAMSData.criticality} 
                                  color={getCriticalityColor(app.EAMSData.criticality)} 
                                  size="small" 
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {app.ApplicationDescription || 'No description available'}
                              </Typography>
                              <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                                <Chip 
                                  label={app.TestingStatus || 'Unknown'} 
                                  color={getStatusColor(app.TestingStatus)} 
                                  size="small" 
                                />
                                {app.Confidence && (
                                  <Chip 
                                    label={`${app.Confidence}% Confidence`} 
                                    color="info" 
                                    size="small" 
                                  />
                                )}
                                {app.Owner?.fullName && (
                                  <Chip 
                                    label={`Owner: ${app.Owner.fullName}`} 
                                    color="default" 
                                    size="small" 
                                  />
                                )}
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < Math.min(applications.length, 5) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Links
              </Typography>
              <List>
                <ListItem button onClick={() => navigate(`/projects/${currentProject?.id}/eams`)}>
                  <ListItemIcon><TableIcon /></ListItemIcon>
                  <ListItemText 
                    primary="EAMS Dashboard" 
                    secondary="Enterprise Architecture Management" 
                  />
                </ListItem>
                <ListItem button onClick={() => navigate(`/projects/${currentProject?.id}/costs`)}>
                  <ListItemIcon><CostIcon /></ListItemIcon>
                  <ListItemText 
                    primary="Cost Monitoring" 
                    secondary="Track project expenses" 
                  />
                </ListItem>
                <ListItem button onClick={() => navigate(`/projects/${currentProject?.id}/dependencies`)}>
                  <ListItemIcon><DependencyIcon /></ListItemIcon>
                  <ListItemText 
                    primary="Dependency Map" 
                    secondary="Visualize relationships" 
                  />
                </ListItem>
                <ListItem button onClick={() => navigate(`/projects/${currentProject?.id}/applications?upload=true`)}>
                  <ListItemIcon><UploadIcon /></ListItemIcon>
                  <ListItemText 
                    primary="Bulk Upload" 
                    secondary="Import from CSV/Excel" 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cost Monitoring */}
      <Box mt={4}>
        <CostMonitoring />
      </Box>
    </Box>
  );
};

export default Dashboard;