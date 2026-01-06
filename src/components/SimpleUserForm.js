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
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  Box
} from '@mui/material';
import awsDataService from '../services/awsDataService';
import { useBffAuth } from '../contexts/BffAuthContext';
import { USER_LEVELS, USER_LEVEL_PERMISSIONS, getAvailableUserLevels } from '../constants/userPermissions';

// US States list
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' }
];

const SimpleUserForm = ({ open, onClose, onSuccess }) => {
  const { user: currentUser } = useBffAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    userLevel: USER_LEVELS.STANDARD,
    assignedCompanyId: '',
    companyAccess: [],
    projectAccess: [],
    isActive: true,
    requireMFA: false,
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    },
    phone: ''
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
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: event.target.value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: event.target.value
      }));
    }
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

      // Create user with proper permission structure
      const result = await awsDataService.createUser({
        ...formData,
        userType: formData.userLevel, // Map userLevel to userType for backward compatibility
        status: 'Active',
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.UserID || 'system'
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
        userLevel: USER_LEVELS.STANDARD,
        assignedCompanyId: '',
        companyAccess: [],
        projectAccess: [],
        isActive: true,
        requireMFA: false,
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'United States'
        },
        phone: ''
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
      userLevel: USER_LEVELS.STANDARD,
      assignedCompanyId: '',
      companyAccess: [],
      projectAccess: [],
      isActive: true,
      requireMFA: false,
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States'
      },
      phone: ''
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
                <InputLabel>User Level</InputLabel>
                <Select
                  value={formData.userLevel}
                  onChange={handleChange('userLevel')}
                  label="User Level"
                >
                  {getAvailableUserLevels(currentUser).map(level => {
                    const levelInfo = USER_LEVEL_PERMISSIONS[level];
                    return (
                      <MenuItem key={level} value={level}>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {levelInfo.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {levelInfo.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    );
                  })}
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
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Address Information
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Street Address"
                value={formData.address.street}
                onChange={handleChange('address.street')}
                fullWidth
                placeholder="123 Main Street"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="City"
                value={formData.address.city}
                onChange={handleChange('address.city')}
                fullWidth
                placeholder="New York"
              />
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>State</InputLabel>
                <Select
                  value={formData.address.state}
                  onChange={handleChange('address.state')}
                  label="State"
                >
                  {US_STATES.map((state) => (
                    <MenuItem key={state.code} value={state.code}>
                      {state.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <TextField
                label="ZIP Code"
                value={formData.address.zipCode}
                onChange={handleChange('address.zipCode')}
                fullWidth
                placeholder="10001"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone Number"
                value={formData.phone}
                onChange={handleChange('phone')}
                fullWidth
                placeholder="(555) 123-4567"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requireMFA}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      requireMFA: e.target.checked
                    }))}
                  />
                }
                label="Require Multi-Factor Authentication (MFA)"
              />
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
