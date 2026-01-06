import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Explore as ExploreIcon,
  Build as BuildIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useBffAuth } from '../contexts/BffAuthContext';
import { useProject } from '../contexts/ProjectContext';
import awsDataService from '../services/awsDataService';
import BackButton from './BackButton';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

const EnhancedDashboard = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useBffAuth();
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompanies: 0,
    totalProjects: 0,
    totalApplications: 0,
    activeUsers: 0,
    recentActivity: []
  });
  const [userGrowthData, setUserGrowthData] = useState(null);
  const [projectStatusData, setProjectStatusData] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [menuAnchor, setMenuAnchor] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get real data from AWS
      const [usersResult, companiesResult, projectsResult] = await Promise.all([
        awsDataService.getUsers(currentUser),
        awsDataService.getCompanies(currentUser),
        awsDataService.getProjects(currentUser)
      ]);
      
      console.log('Loading real dashboard data from AWS...', { usersResult, companiesResult, projectsResult });
      
      // Calculate stats from real data
      const totalUsers = usersResult.success ? usersResult.users.length : 0;
      const totalCompanies = companiesResult.success ? companiesResult.companies.length : 0;
      const totalProjects = projectsResult.success ? projectsResult.projects.length : 0;
      const totalApplications = 0; // Will be added when we implement applications
      const activeUsers = usersResult.success ? usersResult.users.filter(u => u.IsActive).length : 0;
      
      setStats({
        totalUsers,
        totalCompanies,
        totalProjects,
        totalApplications,
        activeUsers,
        recentActivity: [
          { id: 1, action: 'System initialized', user: 'System', timestamp: 'Just now' },
          { id: 2, action: 'Data loaded', user: 'System', timestamp: 'Just now' }
        ]
      });

      // Remove user growth chart - not relevant
      setUserGrowthData(null);

      // Project status data
      const projects = projectsResult.success ? projectsResult.projects : [];
      const projectStatusCounts = projects.reduce((acc, project) => {
        acc[project.Status] = (acc[project.Status] || 0) + 1;
        return acc;
      }, {});
      
      const projectStatusData = Object.entries(projectStatusCounts).map(([status, count]) => ({
        status,
        count
      }));

      setProjectStatusData(projectStatusData);

      // Recent activity from real data
      const recentActivity = [
        { id: 1, action: 'Dashboard loaded', user: currentUser?.firstName || 'User', timestamp: 'Just now' },
        { id: 2, action: `${totalProjects} projects found`, user: 'System', timestamp: 'Just now' },
        { id: 3, action: `${totalUsers} users found`, user: 'System', timestamp: 'Just now' }
      ];

      setRecentActivity(recentActivity);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Fallback to empty data
      setStats({
        totalUsers: 0,
        totalCompanies: 0,
        totalProjects: 0,
        totalApplications: 0,
        activeUsers: 0,
        recentActivity: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = async () => {
    try {
      setLoading(true);
      await loadDashboardData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleMenuOpen = (event) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const getActivityIcon = (activity) => {
    // Default icons based on action type
    if (activity.action?.includes('User')) return <PeopleIcon color="primary" />;
    if (activity.action?.includes('Project')) return <AssessmentIcon color="secondary" />;
    if (activity.action?.includes('Company')) return <BusinessIcon color="success" />;
    return <InfoIcon color="action" />;
  };

  const getActivityColor = (activity) => {
    switch (activity.color) {
      case 'success': return '#4caf50';
      case 'info': return '#2196f3';
      case 'warning': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#757575';
    }
  };

  // Chart data - only show project status, no user growth
  const chartUserGrowthData = null;

  const chartProjectStatusData = projectStatusData ? {
    labels: projectStatusData.map(item => item.status),
    datasets: [
      {
        label: 'Projects',
        data: projectStatusData.map(item => item.count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 205, 86, 0.2)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
        ],
        borderWidth: 1
      }
    ]
  } : {
    labels: ['Loading...'],
    datasets: [
      {
        label: 'Projects',
        data: [0],
        backgroundColor: ['#757575']
      }
    ]
  };

  const applicationTrendsData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Applications Created',
        data: [12, 19, 8, 15],
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      },
      {
        label: 'Applications Updated',
        data: [8, 15, 12, 18],
        backgroundColor: 'rgba(255, 99, 132, 0.6)'
      }
    ]
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LinearProgress sx={{ width: '100%' }} />
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center">
            <BackButton sx={{ mr: 2 }} />
            <Box>
              <Typography variant="h4" gutterBottom>
                EAMS Dashboard
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Enterprise Architecture Management System - Overview
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
                    <Button
                      variant="contained"
                      startIcon={<ExploreIcon />}
                      onClick={() => navigate('/projects')}
                      sx={{ mr: 1 }}
                    >
                      Projects
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<PeopleIcon />}
                      onClick={() => navigate('/users')}
                      sx={{ mr: 1 }}
                    >
                      Users
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<BusinessIcon />}
                      onClick={() => navigate('/companies')}
                      sx={{ mr: 1 }}
                    >
                      Companies
                    </Button>
            <IconButton onClick={loadDashboardData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
            <IconButton onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleMenuClose}
            >
                      <MenuItem onClick={handleRefreshData} disabled={loading}>
                        Refresh Data
                      </MenuItem>
              <MenuItem onClick={handleMenuClose}>Export Data</MenuItem>
              <MenuItem onClick={handleMenuClose}>Settings</MenuItem>
              <MenuItem onClick={handleMenuClose}>Help</MenuItem>
            </Menu>
          </Box>
        </Box>
        
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip 
            label={`Welcome, ${currentUser?.name || 'User'}`} 
            color="primary" 
            size="small" 
          />
          <Chip 
            label={`Role: ${currentUser?.userType || 'User'}`} 
            color="secondary" 
            size="small" 
          />
          {currentProject && (
            <Chip 
              label={`Project: ${currentProject.name}`} 
              color="info" 
              size="small" 
            />
          )}
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="primary">
                    {stats.totalUsers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUpIcon color="success" sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption" color="success.main">
                      +12% this month
                    </Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light', width: 56, height: 56 }}>
                  <PeopleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="secondary">
                    {stats.totalCompanies}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Companies
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUpIcon color="success" sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption" color="success.main">
                      +2 this month
                    </Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: 'secondary.light', width: 56, height: 56 }}>
                  <BusinessIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="info">
                    {stats.totalProjects}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Projects
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <CheckCircleIcon color="success" sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption" color="success.main">
                      100% on track
                    </Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: 'info.light', width: 56, height: 56 }}>
                  <AssessmentIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="warning">
                    {stats.totalApplications}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Applications
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <SpeedIcon color="info" sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption" color="info.main">
                      {stats.activeUsers} active
                    </Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light', width: 56, height: 56 }}>
                  <StorageIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts and Analytics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Project Status Overview
              </Typography>
              <Box height={300}>
                <Doughnut data={chartProjectStatusData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                    },
                    title: {
                      display: false,
                    },
                  },
                }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Project Status Distribution
              </Typography>
              <Box height={300}>
                <Doughnut data={chartProjectStatusData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Application Trends and Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Application Trends
              </Typography>
              <Box height={250}>
                <Bar data={applicationTrendsData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                  },
                }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Recent Activity
                </Typography>
                <Button size="small" color="primary">
                  View All
                </Button>
              </Box>
              <List>
                {(stats.recentActivity || []).map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemIcon>
                        {getActivityIcon(activity)}
                      </ListItemIcon>
                      <ListItemText
                        primary={activity.message}
                        secondary={activity.time}
                      />
                    </ListItem>
                    {index < stats.recentActivity.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Box mt={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PeopleIcon />}
                  sx={{ p: 2 }}
                >
                  Manage Users
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<BusinessIcon />}
                  sx={{ p: 2 }}
                >
                  Manage Companies
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AssessmentIcon />}
                  sx={{ p: 2 }}
                >
                  View Projects
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<SecurityIcon />}
                  sx={{ p: 2 }}
                >
                  Security Settings
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default EnhancedDashboard;
