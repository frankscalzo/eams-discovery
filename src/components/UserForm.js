import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
  Typography,
  Chip,
  Box,
  Alert,
  Autocomplete
} from '@mui/material';
import { USER_TYPES, getUserTypeInfo } from '../constants/userTypes';
import mockAPI from '../services/mockAPI';

const UserForm = ({ open, onClose, user, projects = [] }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    userType: USER_TYPES.EXTERNAL,
    assignedProjects: [],
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [notifications, setNotifications] = useState([]);

  const isEdit = !!user;

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        userType: user.userType || USER_TYPES.EXTERNAL,
        assignedProjects: user.assignedProjects || [],
        isActive: user.isActive !== false
      });
    } else {
      setFormData({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        userType: USER_TYPES.EXTERNAL,
        assignedProjects: [],
        isActive: true
      });
    }
    setErrors({});
  }, [user, open]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (formData.userType === USER_TYPES.EXTERNAL && formData.assignedProjects.length === 0) {
      newErrors.assignedProjects = 'External users must be assigned to at least one project';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      if (isEdit) {
        const result = await mockAPI.userAPI.updateUser(user.id, formData);
        if (result.success) {
          showNotification('User updated successfully', 'success');
          onClose(true);
        } else {
          showNotification('Error updating user: ' + result.error, 'error');
        }
      } else {
        const result = await mockAPI.userAPI.createUser(formData);
        if (result.success) {
          showNotification('User created successfully', 'success');
          onClose(true);
        } else {
          showNotification('Error creating user: ' + result.error, 'error');
        }
      }
    } catch (error) {
      showNotification('Error saving user: ' + error.message, 'error');
    } finally {
      setLoading(false);
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

  const handleUserTypeChange = (newUserType) => {
    setFormData(prev => ({
      ...prev,
      userType: newUserType,
      // Clear assigned projects for internal users and admins
      assignedProjects: (newUserType === USER_TYPES.INTERNAL || newUserType === USER_TYPES.ADMIN) 
        ? [] 
        : prev.assignedProjects
    }));
  };

  const getProjectOptions = () => {
    return projects.map(project => ({
      value: project.id,
      label: project.name
    }));
  };

  const getSelectedProjects = () => {
    return formData.assignedProjects.map(projectId => {
      const project = projects.find(p => p.id === projectId);
      return {
        value: projectId,
        label: project?.name || `Project ${projectId}`
      };
    });
  };

  const userTypeInfo = getUserTypeInfo(formData.userType);

  return (
    <Dialog 
      open={open} 
      onClose={() => onClose(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {isEdit ? 'Edit User' : 'Create New User'}
      </DialogTitle>
      
      <DialogContent>
        {/* Notifications */}
        {notifications.map(notification => (
          <Alert 
            key={notification.id}
            severity={notification.type}
            sx={{ mb: 2 }}
            onClose={() => setNotifications(prev => 
              prev.filter(n => n.id !== notification.id)
            )}
          >
            {notification.message}
          </Alert>
        ))}

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              error={!!errors.username}
              helperText={errors.username}
              required
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
              required
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="First Name"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              error={!!errors.firstName}
              helperText={errors.firstName}
              required
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              error={!!errors.lastName}
              helperText={errors.lastName}
              required
            />
          </Grid>

          {/* User Type */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              User Type & Permissions
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>User Type</InputLabel>
              <Select
                value={formData.userType}
                onChange={(e) => handleUserTypeChange(e.target.value)}
                label="User Type"
              >
                <MenuItem value={USER_TYPES.ADMIN}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip 
                      label="Administrator" 
                      color="error" 
                      size="small" 
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body2">
                      Full system access
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value={USER_TYPES.INTERNAL}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip 
                      label="Internal User" 
                      color="primary" 
                      size="small" 
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body2">
                      Access to all projects
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value={USER_TYPES.EXTERNAL}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip 
                      label="External User" 
                      color="secondary" 
                      size="small" 
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body2">
                      Limited to assigned projects
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                />
              }
              label="Active User"
            />
          </Grid>

          {/* Role Description */}
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {userTypeInfo.name}
              </Typography>
              <Typography variant="body2">
                {userTypeInfo.description}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Permissions:</strong> {userTypeInfo.permissions.join(', ')}
              </Typography>
            </Alert>
          </Grid>

          {/* Project Assignment (only for external users) */}
          {formData.userType === USER_TYPES.EXTERNAL && (
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Project Assignment
              </Typography>
              <Autocomplete
                multiple
                options={getProjectOptions()}
                value={getSelectedProjects()}
                onChange={(event, newValue) => {
                  const projectIds = newValue.map(option => option.value);
                  handleInputChange('assignedProjects', projectIds);
                }}
                getOptionLabel={(option) => option.label}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Assigned Projects"
                    error={!!errors.assignedProjects}
                    helperText={errors.assignedProjects || 'Select projects this user can access'}
                    required
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.value}
                      label={option.label}
                      color="secondary"
                    />
                  ))
                }
              />
            </Grid>
          )}

          {/* Internal/Admin users info */}
          {(formData.userType === USER_TYPES.INTERNAL || formData.userType === USER_TYPES.ADMIN) && (
            <Grid item xs={12}>
              <Alert severity="success">
                <Typography variant="body2">
                  This user will have access to <strong>all projects</strong> automatically.
                  No project assignment is needed.
                </Typography>
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => onClose(false)}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Saving...' : (isEdit ? 'Update User' : 'Create User')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserForm;
