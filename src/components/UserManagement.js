import React, { useState, useEffect } from 'react';
import awsDataService from '../services/awsDataService';
import { useBffAuth } from '../contexts/BffAuthContext';
import SimpleUserForm from './SimpleUserForm';
import DynamicUserForm from './DynamicUserForm';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Avatar,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Person,
  AdminPanelSettings,
  Business,
  Search,
  FilterList,
  Refresh,
  ArrowBack
} from '@mui/icons-material';
import { USER_TYPES, getUserTypeInfo, canManageUsers } from '../constants/userTypes';
import mockAPI from '../services/mockAPI';
import enhancedUserAPI from '../services/enhancedUserAPI';
import UserForm from './UserForm';
import EnhancedUserForm from './EnhancedUserForm';
import BackButton from './BackButton';
import { useNavigate, useParams } from 'react-router-dom';

const UserManagement = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useBffAuth();
  const { userId } = useParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [enhancedUserFormOpen, setEnhancedUserFormOpen] = useState(false);
  const [simpleFormOpen, setSimpleFormOpen] = useState(false);
  const [dynamicFormOpen, setDynamicFormOpen] = useState(false);
  const [useDynamicForm, setUseDynamicForm] = useState(true); // Default to dynamic form
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuUser, setMenuUser] = useState(null);

  useEffect(() => {
    loadUsers();
    loadProjects();
    
    // Handle direct navigation to user form
    if (userId === 'new') {
      setEnhancedUserFormOpen(true);
    } else if (userId) {
      // Load specific user for editing
      loadUserForEdit(userId);
    }
  }, [userId]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Load real data from AWS DynamoDB
      const result = await awsDataService.getUsers(currentUser);
      if (result.success) {
        setUsers(result.users);
        console.log('Loaded users from AWS:', result.users);
      } else {
        console.error('Error loading users:', result.error);
        showNotification('Error loading users: ' + result.error, 'error');
        // Fallback to empty array
        setUsers([]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      showNotification('Error loading users: ' + error.message, 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserForEdit = async (userId) => {
    try {
      // Find user in the current users list
      const user = users.find(u => u.UserID === userId || u.id === userId);
      if (user) {
        setSelectedUser(user);
        setEnhancedUserFormOpen(true);
      } else {
        showNotification('User not found', 'error');
        navigate('/users');
      }
    } catch (error) {
      showNotification('Error loading user: ' + error.message, 'error');
      navigate('/users');
    }
  };

  const loadProjects = async () => {
    try {
      const result = await mockAPI.projectAPI.getProjects();
      if (result.success) {
        setProjects(result.projects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
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

  const handleCreateUser = () => {
    setSelectedUser(null);
    setEnhancedUserFormOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEnhancedUserFormOpen(true);
  };

  const handleEnhancedUserFormClose = (success) => {
    setEnhancedUserFormOpen(false);
    setSelectedUser(null);
    if (success) {
      loadUsers();
      showNotification('User saved successfully', 'success');
    }
    // Navigate back to users list if we came from a direct route
    if (userId) {
      navigate('/users');
    }
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const result = await mockAPI.userAPI.deleteUser(userToDelete.id);
      if (result.success) {
        showNotification('User deleted successfully', 'success');
        loadUsers();
      } else {
        showNotification('Error deleting user: ' + result.error, 'error');
      }
    } catch (error) {
      showNotification('Error deleting user: ' + error.message, 'error');
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleUserFormClose = (saved = false) => {
    setUserFormOpen(false);
    setSelectedUser(null);
    if (saved) {
      loadUsers();
    }
  };

  const handleMenuOpen = (event, user) => {
    setAnchorEl(event.currentTarget);
    setMenuUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuUser(null);
  };

  const getRoleIcon = (userType) => {
    switch (userType) {
      case USER_TYPES.ADMIN:
        return <AdminPanelSettings color="error" />;
      case USER_TYPES.INTERNAL:
        return <Person color="primary" />;
      case USER_TYPES.EXTERNAL:
        return <Business color="secondary" />;
      default:
        return <Person />;
    }
  };

  const getRoleColor = (userType) => {
    switch (userType) {
      case USER_TYPES.ADMIN:
        return 'error';
      case USER_TYPES.INTERNAL:
        return 'primary';
      case USER_TYPES.EXTERNAL:
        return 'secondary';
      default:
        return 'default';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || user.userType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getUserStats = () => {
    const total = users.length;
    const admins = users.filter(u => u.userType === USER_TYPES.ADMIN).length;
    const internal = users.filter(u => u.userType === USER_TYPES.INTERNAL).length;
    const external = users.filter(u => u.userType === USER_TYPES.EXTERNAL).length;
    const active = users.filter(u => u.isActive).length;

    return { total, admins, internal, external, active };
  };

  const stats = getUserStats();

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading users...</Typography>
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

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BackButton sx={{ mr: 2 }} />
          <Typography variant="h4">
            User Management
          </Typography>
        </Box>
        {canManageUsers(currentUser) && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={useDynamicForm}
                  onChange={(e) => setUseDynamicForm(e.target.checked)}
                />
              }
              label="Advanced Permissions"
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                if (useDynamicForm) {
                  setDynamicFormOpen(true);
                } else {
                  setSimpleFormOpen(true);
                }
              }}
            >
              Create User
            </Button>
          </Box>
        )}
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="error">
                {stats.admins}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Administrators
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                {stats.internal}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Internal Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="secondary">
                {stats.external}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                External Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {stats.active}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Filter by Type</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="Filter by Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value={USER_TYPES.ADMIN}>Administrators</MenuItem>
                  <MenuItem value={USER_TYPES.INTERNAL}>Internal Users</MenuItem>
                  <MenuItem value={USER_TYPES.EXTERNAL}>External Users</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadUsers}
                fullWidth
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Projects</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {user.firstName} {user.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          @{user.username}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.UserLevel || user.userType || 'standard'}
                      color={user.UserLevel === 'admin' ? 'error' : user.UserLevel === 'super_user' ? 'warning' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {user.CanAccessAllProjects || user.UserLevel === 'admin' ? (
                      <Chip label="All Projects" color="success" size="small" />
                    ) : (
                      <Typography variant="body2">
                        {user.AssignedProjects?.length || user.assignedProjects?.length || 0} assigned
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.isActive ? 'Active' : 'Inactive'}
                      color={user.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {user.lastLogin ? 
                      new Date(user.lastLogin).toLocaleDateString() : 
                      'Never'
                    }
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, user)}
                      size="small"
                    >
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          handleEditUser(menuUser);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit User</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          handleDeleteUser(menuUser);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete User</ListItemText>
        </MenuItem>
      </Menu>

      {/* User Form Dialog */}
      <UserForm
        open={userFormOpen}
        onClose={handleUserFormClose}
        user={selectedUser}
        projects={projects}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{userToDelete?.firstName} {userToDelete?.lastName}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteUser} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced User Form */}
      <EnhancedUserForm
        open={enhancedUserFormOpen}
        onClose={handleEnhancedUserFormClose}
        user={selectedUser}
        onSuccess={handleEnhancedUserFormClose}
      />

      {/* Simple User Form */}
      <SimpleUserForm
        open={simpleFormOpen}
        onClose={() => setSimpleFormOpen(false)}
        onSuccess={(newUser) => {
          console.log('User created successfully:', newUser);
          loadUsers(); // Refresh the list
        }}
      />

      {/* Dynamic User Form */}
      <DynamicUserForm
        open={dynamicFormOpen}
        onClose={() => setDynamicFormOpen(false)}
        onSuccess={(newUser) => {
          console.log('User created successfully:', newUser);
          loadUsers(); // Refresh the list
        }}
      />
    </Box>
  );
};

export default UserManagement;
