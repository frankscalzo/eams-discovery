import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Container,
  Chip,
  Avatar,
  Divider
} from '@mui/material';
import {
  Business as BusinessIcon,
  FolderOpen as ProjectIcon,
  Add as AddIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Assessment as ReportIcon
} from '@mui/icons-material';
import { Button as KendoButton } from '@progress/kendo-react-buttons';
import { Card as KendoCard } from '@progress/kendo-react-layout';
import { useBffAuth } from '../contexts/BffAuthContext';
import mockAPI from '../services/mockAPI';

const RootDashboard = () => {
  const { user, logout } = useBffAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load companies and projects
      const [companiesData, projectsData] = await Promise.all([
        mockAPI.companyAPI.getCompanies(),
        mockAPI.projectAPI.getProjects()
      ]);
      setCompanies(companiesData || []);
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = () => {
    navigate('/companies/new');
  };

  const handleCreateProject = () => {
    navigate('/projects/new');
  };

  const handleViewCompanies = () => {
    navigate('/companies');
  };

  const handleViewProjects = () => {
    navigate('/projects');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="eams-header">
      <div className="eams-container">
        <div className="eams-title">EAMS</div>
        <div className="eams-subtitle">Enterprise Architecture Management System</div>
      </div>
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Welcome Section */}
        <KendoCard className="eams-card fade-in" style={{ marginBottom: '30px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <Box>
              <Typography variant="h5" component="h1">
                Welcome back, {user?.name || 'User'}!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage your companies and projects from the EAMS dashboard
              </Typography>
            </Box>
            <Box sx={{ ml: 'auto' }}>
              <KendoButton
                themeColor="secondary"
                onClick={handleLogout}
                size="medium"
              >
                Logout
              </KendoButton>
            </Box>
          </Box>
        </KendoCard>

        {/* Quick Actions */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <KendoCard className="eams-card fade-in">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <BusinessIcon sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography variant="h6" component="h2">
                    Company Management
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Manage your companies, their projects, and associated resources.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`${companies.length} Companies`} 
                    color="primary" 
                    variant="outlined" 
                    size="small" 
                  />
                </Box>
              </CardContent>
              <CardActions>
                <KendoButton
                  themeColor="primary"
                  onClick={handleViewCompanies}
                  style={{ marginRight: '8px' }}
                >
                  View Companies
                </KendoButton>
                <KendoButton
                  themeColor="primary"
                  onClick={handleCreateCompany}
                  fillMode="outline"
                >
                  <AddIcon sx={{ mr: 1, fontSize: 16 }} />
                  Create Company
                </KendoButton>
              </CardActions>
            </KendoCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <KendoCard className="eams-card fade-in">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ProjectIcon sx={{ color: 'secondary.main', mr: 1 }} />
                  <Typography variant="h6" component="h2">
                    Project Management
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Create and manage projects, applications, and dependencies.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`${projects.length} Projects`} 
                    color="secondary" 
                    variant="outlined" 
                    size="small" 
                  />
                </Box>
              </CardContent>
              <CardActions>
                <KendoButton
                  themeColor="secondary"
                  onClick={handleViewProjects}
                  style={{ marginRight: '8px' }}
                >
                  View Projects
                </KendoButton>
                <KendoButton
                  themeColor="secondary"
                  onClick={handleCreateProject}
                  fillMode="outline"
                >
                  <AddIcon sx={{ mr: 1, fontSize: 16 }} />
                  Create Project
                </KendoButton>
              </CardActions>
            </KendoCard>
          </Grid>
        </Grid>

        {/* Recent Activity */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <KendoCard className="eams-card fade-in">
              <CardContent>
                <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
                  Recent Companies
                </Typography>
                {companies.length > 0 ? (
                  <Box>
                    {companies.slice(0, 3).map((company, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                        <BusinessIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {company.companyName || 'Unnamed Company'}
                        </Typography>
                        <Chip 
                          label={company.projectLocation || 'Unknown'} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>
                    ))}
                    {companies.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        And {companies.length - 3} more...
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No companies found. Create your first company to get started.
                  </Typography>
                )}
              </CardContent>
            </KendoCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <KendoCard className="eams-card fade-in">
              <CardContent>
                <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
                  Recent Projects
                </Typography>
                {projects.length > 0 ? (
                  <Box>
                    {projects.slice(0, 3).map((project, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                        <ProjectIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {project.projectName || 'Unnamed Project'}
                        </Typography>
                        <Chip 
                          label={project.status || 'Active'} 
                          size="small" 
                          color={project.status === 'Active' ? 'success' : 'default'}
                          variant="outlined" 
                        />
                      </Box>
                    ))}
                    {projects.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        And {projects.length - 3} more...
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No projects found. Create your first project to get started.
                  </Typography>
                )}
              </CardContent>
            </KendoCard>
          </Grid>
        </Grid>
      </Container>
    </div>
  );
};

export default RootDashboard;
