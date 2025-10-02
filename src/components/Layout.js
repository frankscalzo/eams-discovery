import React from 'react';
import { 
  Box, 
  Typography, 
  AppBar, 
  Toolbar, 
  Container, 
  Button,
  Menu,
  MenuItem,
  IconButton,
  Chip
} from '@mui/material';
import { 
  Business, 
  Dashboard, 
  Apps, 
  AccountTree, 
  AttachMoney,
  Architecture,
  People,
  Menu as MenuIcon,
  AccountCircle
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentProject, userRole } = useProject();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const navigationItems = [
    { label: 'Dashboard', path: 'dashboard', icon: <Dashboard /> },
    { label: 'Applications', path: 'applications', icon: <Apps /> },
    { label: 'Dependencies', path: 'dependencies', icon: <AccountTree /> },
    { label: 'Costs', path: 'costs', icon: <AttachMoney /> },
    { label: 'EAMS', path: 'eams', icon: <Architecture /> }
  ];

  const isActive = (path) => {
    return location.pathname.includes(path);
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            EAMS - Enterprise Architecture Management System
          </Typography>
          
          {currentProject && (
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              <Chip
                label={`Project: ${currentProject.name}`}
                color="secondary"
                variant="outlined"
                sx={{ mr: 1 }}
              />
              <Chip
                label={`Role: ${userRole}`}
                color="primary"
                variant="outlined"
              />
            </Box>
          )}

          <Button
            color="inherit"
            startIcon={<Dashboard />}
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 1 }}
          >
            Home
          </Button>

          <Button
            color="inherit"
            startIcon={<Business />}
            onClick={() => navigate('/companies')}
            sx={{ mr: 1 }}
          >
            Companies
          </Button>

          <Button
            color="inherit"
            startIcon={<Apps />}
            onClick={() => navigate('/projects')}
            sx={{ mr: 1 }}
          >
            Projects
          </Button>

          <Button
            color="inherit"
            startIcon={<People />}
            onClick={() => navigate('/users')}
            sx={{ mr: 1 }}
          >
            Users
          </Button>

          <IconButton
            color="inherit"
            onClick={handleMenuOpen}
          >
            <AccountCircle />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => { navigate('/password-reset'); handleMenuClose(); }}>
              Change Password
            </MenuItem>
            <MenuItem onClick={() => { /* Handle logout */ handleMenuClose(); }}>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {currentProject && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Container maxWidth="xl">
            <Box sx={{ display: 'flex', gap: 1, py: 1 }}>
              {navigationItems.map((item) => (
                <Button
                  key={item.path}
                  startIcon={item.icon}
                  onClick={() => navigate(`/projects/${currentProject.id}/${item.path}`)}
                  color={isActive(item.path) ? 'primary' : 'inherit'}
                  variant={isActive(item.path) ? 'contained' : 'text'}
                  size="small"
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          </Container>
        </Box>
      )}

      <Container maxWidth="xl">
        <Box py={3}>
          <Outlet />
        </Box>
      </Container>
    </Box>
  );
};

export default Layout;