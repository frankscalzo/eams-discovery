import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import awsDataService from '../services/awsDataService';
import { useAuth } from '../contexts/AuthContext';

const SimpleUserForm = ({ open, onClose, onSuccess }) => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    userType: 'company_standard_user',
    assignedCompanyId: '',
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    if (open) {
      // Load companies when dialog opens
      loadCompanies();
    }
  }, [open]);

  const loadCompanies = async () => {
    try {
      const result = await awsDataService.getCompanies(currentUser);
      if (result.success) {
        setCompanies(result.companies);
        
        // Set default company if only one exists
        if (result.companies.length === 1) {
          setFormData(prev => ({
            ...prev,
            assignedCompanyId: result.companies[0].CompanyID
          }));
        }
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.username || !formData.password) {
        throw new Error('All fields are required');
      }

      if (!formData.assignedCompanyId) {
        throw new Error('Please select a company');
      }

      // Create user
      const result = await awsDataService.createUser({
        ...formData,
        status: 'Active',
        createdAt: new Date().toISOString()
      }, currentUser);

      if (!result.success) {
        throw new Error(result.error);
      }

      const newUser = result.user;

      console.log('User created:', newUser);
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
        userType: 'company_standard_user',
        assignedCompanyId: '',
        isActive: true
      });

      onSuccess?.(newUser);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
      userType: 'company_standard_user',
      assignedCompanyId: '',
      isActive: true
    });
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Create New User</Typography>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name *"
                value={formData.firstName}
                onChange={handleChange('firstName')}
                fullWidth
                required
                placeholder="Enter first name"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name *"
                value={formData.lastName}
                onChange={handleChange('lastName')}
                fullWidth
                required
                placeholder="Enter last name"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email *"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                fullWidth
                required
                placeholder="user@company.com"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Username *"
                value={formData.username}
                onChange={handleChange('username')}
                fullWidth
                required
                placeholder="Enter username"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Password *"
                type="password"
                value={formData.password}
                onChange={handleChange('password')}
                fullWidth
                required
                placeholder="Enter password"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>User Type</InputLabel>
                <Select
                  value={formData.userType}
                  onChange={handleChange('userType')}
                  label="User Type"
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="company_standard_user">Standard User</MenuItem>
                  <MenuItem value="company_super_user">Super User</MenuItem>
                  <MenuItem value="read_only">Read Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Company</InputLabel>
                <Select
                  value={formData.assignedCompanyId}
                  onChange={handleChange('assignedCompanyId')}
                  label="Company"
                >
                  {companies.map((company) => (
                    <MenuItem key={company.CompanyID} value={company.CompanyID}>
                      {company.Name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create User'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SimpleUserForm;
