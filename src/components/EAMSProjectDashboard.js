import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  Snackbar,
  Tooltip,
  Badge
} from '@mui/material';
import {
  MoreVert,
  Add,
  Search,
  FilterList,
  Refresh,
  Dashboard,
  Apps,
  AccountTree,
  AttachMoney,
  Timeline,
  Assessment,
  Settings,
  Visibility,
  Edit,
  Delete,
  Share,
  Download,
  Upload,
  Star,
  StarBorder,
  Warning,
  CheckCircle,
  Error,
  Info
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import mockAPI from '../services/mockAPI';

const LeanIXProjectDashboard = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuItem, setMenuItem] = useState(null);

  useEffect(() => {
    loadProject();
    loadApplications();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const result = await mockAPI.projectAPI.getProjects();
      const project = result.find(p => p.ProjectID === projectId);
      if (project) {
        setProject(project);
      } else {
        showNotification('Project not found', 'error');
        navigate('/projects');
      }
    } catch (error) {
      showNotification('Error loading project: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const result = await mockAPI.applicationAPI.getApplications(projectId);
      setApplications(result);
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const showNotification = (message, type = 'success') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [...prev, notification]);
  };

  const handleMenuOpen = (event, item) => {
    setAnchorEl(event.currentTarget);
    setMenuItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuItem(null);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'pending':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <CheckCircle />;
      case 'inactive':
        return <Error />;
      case 'pending':
        return <Warning />;
      default:
        return <Info />;
    }
  };

  const renderOverviewTab = () => (
    <Box>
      {/* Project Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {project?.name}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {project?.description}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={getStatusIcon(project?.status)}
                label={project?.status || 'Unknown'}
                color={getStatusColor(project?.status)}
                size="small"
              />
              <Chip
                label={`Budget: $${project?.budget?.toLocaleString() || 0}`}
                variant="outlined"
                size="small"
              />
              <Chip
                label={`Created: ${new Date(project?.createdAt).toLocaleDateString()}`}
                variant="outlined"
                size="small"
              />
            </Box>
          </Box>
          <Box>
            <IconButton onClick={(e) => handleMenuOpen(e, project)}>
              <MoreVert />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <Apps />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {applications.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Applications
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <CheckCircle />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {applications.filter(app => app.status === 'Active').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Apps
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <AccountTree />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {applications.filter(app => app.integrationType).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Integrations
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <AttachMoney />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    ${project?.budget?.toLocaleString() || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Budget
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Applications */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Recent Applications
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => navigate(`/projects/${projectId}/applications/new`)}
            >
              Add Application
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Application Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {applications.slice(0, 5).map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <Typography variant="subtitle2">
                        {app.applicationName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {app.applicationDescription}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(app.status)}
                        label={app.status || 'Unknown'}
                        color={getStatusColor(app.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{app.team}</TableCell>
                    <TableCell>{app.owner}</TableCell>
                    <TableCell>
                      {new Date(app.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => navigate(`/projects/${projectId}/applications/${app.id}`)}>
                        <Visibility />
                      </IconButton>
                      <IconButton size="small">
                        <Edit />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  const renderApplicationsTab = () => (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Applications Inventory
            </Typography>
            <Box>
              <Button
                variant="outlined"
                startIcon={<Search />}
                sx={{ mr: 1 }}
              >
                Search
              </Button>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                sx={{ mr: 1 }}
              >
                Filter
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate(`/projects/${projectId}/applications/new`)}
              >
                Add Application
              </Button>
            </Box>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Application Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Manager</TableCell>
                  <TableCell>Integration</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2">
                        {app.applicationName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200 }}>
                        {app.applicationDescription}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(app.status)}
                        label={app.status || 'Unknown'}
                        color={getStatusColor(app.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{app.team}</TableCell>
                    <TableCell>{app.owner}</TableCell>
                    <TableCell>{app.manager}</TableCell>
                    <TableCell>
                      {app.integrationType && (
                        <Chip
                          label={app.integrationType}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(app.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => navigate(`/projects/${projectId}/applications/${app.id}`)}>
                        <Visibility />
                      </IconButton>
                      <IconButton size="small">
                        <Edit />
                      </IconButton>
                      <IconButton size="small">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  const renderDependenciesTab = () => (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Application Dependencies
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Visualize and manage dependencies between applications in this project.
          </Typography>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <AccountTree sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Dependency Map
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Interactive dependency visualization will be available here.
            </Typography>
            <Button variant="outlined" startIcon={<Add />}>
              Create Dependency Map
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const renderCostsTab = () => (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Project Costs
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Monitor and analyze costs associated with this project.
          </Typography>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <AttachMoney sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Cost Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Detailed cost breakdown and analysis will be available here.
            </Typography>
            <Button variant="outlined" startIcon={<Assessment />}>
              View Cost Details
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const renderReportsTab = () => (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Project Reports
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Generate and view various reports for this project.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Application Inventory
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Complete list of all applications
                  </Typography>
                  <Button variant="outlined" startIcon={<Download />} fullWidth>
                    Download Report
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Dependency Report
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Application dependencies and relationships
                  </Typography>
                  <Button variant="outlined" startIcon={<Download />} fullWidth>
                    Download Report
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Cost Analysis
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Detailed cost breakdown and analysis
                  </Typography>
                  <Button variant="outlined" startIcon={<Download />} fullWidth>
                    Download Report
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading project...
        </Typography>
      </Box>
    );
  }

  if (!project) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Project not found
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Notifications */}
      {notifications.map(notification => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={6000}
          onClose={() => setNotifications(prev => 
            prev.filter(n => n.id !== notification.id)
          )}
        >
          <Alert 
            severity={notification.type}
            onClose={() => setNotifications(prev => 
              prev.filter(n => n.id !== notification.id)
            )}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}

      {/* Project Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Dashboard />} label="Overview" />
          <Tab icon={<Apps />} label="Applications" />
          <Tab icon={<AccountTree />} label="Dependencies" />
          <Tab icon={<AttachMoney />} label="Costs" />
          <Tab icon={<Assessment />} label="Reports" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && renderOverviewTab()}
      {activeTab === 1 && renderApplicationsTab()}
      {activeTab === 2 && renderDependenciesTab()}
      {activeTab === 3 && renderCostsTab()}
      {activeTab === 4 && renderReportsTab()}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Project</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Share fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share Project</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Download fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Data</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>Project Settings</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default LeanIXProjectDashboard;
