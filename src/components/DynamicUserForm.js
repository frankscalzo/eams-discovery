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
  Box,
  Stepper,
  Step,
  StepLabel,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Chip
} from '@mui/material';
import awsDataService from '../services/awsDataService';
import { useBffAuth } from '../contexts/BffAuthContext';
import { 
  PERMISSION_TYPES, 
  PERMISSION_CATEGORIES, 
  PERMISSION_DESCRIPTIONS,
  ACCESS_TYPES,
  createUserAccess
} from '../constants/dynamicPermissions';

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

const DynamicUserForm = ({ open, onClose, onSuccess, user = null }) => {
  const { user: currentUser } = useBffAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Step 1: Authentication Data
  const [authData, setAuthData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    }
  });
  
  // Step 2: Permission Data
  const [permissionData, setPermissionData] = useState({
    primaryCompanyId: '',
    companyAccess: [], // Array of { companyId, projectIds, permissions, accessType }
    globalPermissions: [], // System-wide permissions
    isActive: true,
    requireMFA: false
  });
  
  const [companies, setCompanies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [accessType, setAccessType] = useState(ACCESS_TYPES.READ);

  const steps = ['Authentication', 'Company Assignment', 'Permissions'];

  useEffect(() => {
    if (open) {
      loadCompanies();
      if (user) {
        // Load existing user data for editing
        setAuthData({
          firstName: user.FirstName || '',
          lastName: user.LastName || '',
          email: user.Email || '',
          username: user.Username || '',
          password: '',
          phone: user.Phone || '',
          address: user.Address || {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'United States'
          }
        });
        setPermissionData({
          primaryCompanyId: user.PrimaryCompanyId || '',
          companyAccess: user.CompanyAccess || [],
          globalPermissions: user.GlobalPermissions || [],
          isActive: user.IsActive !== false,
          requireMFA: user.RequireMFA || false
        });
      }
    }
  }, [open, user]);

  const loadCompanies = async () => {
    try {
      const result = await awsDataService.getCompanies(currentUser);
      if (result.success) {
        setCompanies(result.companies);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const loadProjects = async (companyId) => {
    try {
      const result = await awsDataService.getProjects(currentUser);
      if (result.success) {
        // Filter projects by company
        const companyProjects = result.projects.filter(project => 
          project.CompanyID === companyId
        );
        setProjects(companyProjects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleAuthChange = (field) => (event) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setAuthData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: event.target.value
        }
      }));
    } else {
      setAuthData(prev => ({
        ...prev,
        [field]: event.target.value
      }));
    }
  };

  const handleCompanyChange = (event) => {
    const companyId = event.target.value;
    setSelectedCompany(companyId);
    setSelectedProjects([]);
    if (companyId) {
      loadProjects(companyId);
    }
  };

  const handleProjectToggle = (projectId) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handlePermissionToggle = (permission) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const addCompanyAccess = () => {
    if (selectedCompany && selectedPermissions.length > 0) {
      const newAccess = createUserAccess(
        selectedCompany,
        selectedProjects,
        selectedPermissions
      );
      
      setPermissionData(prev => ({
        ...prev,
        companyAccess: [...prev.companyAccess, newAccess]
      }));
      
      // Reset selection
      setSelectedCompany('');
      setSelectedProjects([]);
      setSelectedPermissions([]);
      setAccessType(ACCESS_TYPES.READ);
    }
  };

  const removeCompanyAccess = (index) => {
    setPermissionData(prev => ({
      ...prev,
      companyAccess: prev.companyAccess.filter((_, i) => i !== index)
    }));
  };

  const handleGlobalPermissionToggle = (permission) => {
    setPermissionData(prev => ({
      ...prev,
      globalPermissions: prev.globalPermissions.includes(permission)
        ? prev.globalPermissions.filter(p => p !== permission)
        : [...prev.globalPermissions, permission]
    }));
  };

  const handleNext = () => {
    if (activeStep === 0) {
      // Validate authentication data
      if (!authData.firstName || !authData.lastName || !authData.email || !authData.username) {
        setError('Please fill in all required fields');
        return;
      }
    }
    setActiveStep(prev => prev + 1);
    setError('');
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError('');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const userData = {
        ...authData,
        ...permissionData,
        status: 'Active',
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.UserID || 'system'
      };

      const result = await awsDataService.createUser(userData, currentUser);

      if (!result.success) {
        throw new Error(result.error);
      }

      onSuccess?.(result.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderAuthStep = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Basic Information
        </Typography>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          label="First Name *"
          value={authData.firstName}
          onChange={handleAuthChange('firstName')}
          fullWidth
          required
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          label="Last Name *"
          value={authData.lastName}
          onChange={handleAuthChange('lastName')}
          fullWidth
          required
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          label="Email *"
          type="email"
          value={authData.email}
          onChange={handleAuthChange('email')}
          fullWidth
          required
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          label="Username *"
          value={authData.username}
          onChange={handleAuthChange('username')}
          fullWidth
          required
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          label="Password *"
          type="password"
          value={authData.password}
          onChange={handleAuthChange('password')}
          fullWidth
          required
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          label="Phone"
          value={authData.phone}
          onChange={handleAuthChange('phone')}
          fullWidth
        />
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
          Address
        </Typography>
      </Grid>
      
      <Grid item xs={12}>
        <TextField
          label="Street Address"
          value={authData.address.street}
          onChange={handleAuthChange('address.street')}
          fullWidth
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          label="City"
          value={authData.address.city}
          onChange={handleAuthChange('address.city')}
          fullWidth
        />
      </Grid>
      
      <Grid item xs={12} sm={3}>
        <FormControl fullWidth>
          <InputLabel>State</InputLabel>
          <Select
            value={authData.address.state}
            onChange={handleAuthChange('address.state')}
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
          value={authData.address.zipCode}
          onChange={handleAuthChange('address.zipCode')}
          fullWidth
        />
      </Grid>
    </Grid>
  );

  const renderCompanyStep = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Company Assignment
        </Typography>
      </Grid>
      
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Primary Company *</InputLabel>
          <Select
            value={permissionData.primaryCompanyId}
            onChange={(e) => setPermissionData(prev => ({
              ...prev,
              primaryCompanyId: e.target.value
            }))}
            label="Primary Company *"
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
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Additional Company Access
        </Typography>
      </Grid>
      
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Company</InputLabel>
          <Select
            value={selectedCompany}
            onChange={handleCompanyChange}
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
      
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Access Type</InputLabel>
          <Select
            value={accessType}
            onChange={(e) => setAccessType(e.target.value)}
            label="Access Type"
          >
            <MenuItem value={ACCESS_TYPES.READ}>Read Only</MenuItem>
            <MenuItem value={ACCESS_TYPES.WRITE}>Read/Write</MenuItem>
            <MenuItem value={ACCESS_TYPES.ADMIN}>Admin</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={4}>
        <Button 
          variant="outlined" 
          onClick={addCompanyAccess}
          disabled={!selectedCompany || selectedPermissions.length === 0}
          fullWidth
        >
          Add Access
        </Button>
      </Grid>
      
      {permissionData.companyAccess.length > 0 && (
        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Current Company Access
          </Typography>
          <List dense>
            {permissionData.companyAccess.map((access, index) => {
              const company = companies.find(c => c.CompanyID === access.companyId);
              return (
                <ListItem key={index}>
                  <ListItemText
                    primary={company?.Name || 'Unknown Company'}
                    secondary={`${access.accessType} - ${access.permissions.length} permissions`}
                  />
                  <ListItemSecondaryAction>
                    <Button 
                      size="small" 
                      color="error"
                      onClick={() => removeCompanyAccess(index)}
                    >
                      Remove
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        </Grid>
      )}
    </Grid>
  );

  const renderPermissionsStep = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Permissions
        </Typography>
      </Grid>
      
      {selectedCompany && (
        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Select Permissions for {companies.find(c => c.CompanyID === selectedCompany)?.Name}
          </Typography>
          
          {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => (
            <Box key={categoryKey} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                {category.name}
              </Typography>
              <Grid container spacing={1}>
                {category.permissions.map((permission) => (
                  <Grid item xs={12} sm={6} key={permission}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedPermissions.includes(permission)}
                          onChange={() => handlePermissionToggle(permission)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">
                            {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {PERMISSION_DESCRIPTIONS[permission]}
                          </Typography>
                        </Box>
                      }
                    />
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ mt: 1 }} />
            </Box>
          ))}
        </Grid>
      )}
      
      <Grid item xs={12}>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Global System Permissions
        </Typography>
        
        {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => (
          <Box key={categoryKey} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              {category.name}
            </Typography>
            <Grid container spacing={1}>
              {category.permissions.map((permission) => (
                <Grid item xs={12} sm={6} key={permission}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={permissionData.globalPermissions.includes(permission)}
                        onChange={() => handleGlobalPermissionToggle(permission)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">
                          {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {PERMISSION_DESCRIPTIONS[permission]}
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
              ))}
            </Grid>
            <Divider sx={{ mt: 1 }} />
          </Box>
        ))}
      </Grid>
      
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={permissionData.requireMFA}
              onChange={(e) => setPermissionData(prev => ({
                ...prev,
                requireMFA: e.target.checked
              }))}
            />
          }
          label="Require Multi-Factor Authentication (MFA)"
        />
      </Grid>
    </Grid>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography variant="h6">
          {user ? 'Edit User' : 'Create New User'}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {activeStep === 0 && renderAuthStep()}
        {activeStep === 1 && renderCompanyStep()}
        {activeStep === 2 && renderPermissionsStep()}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}
        
        {activeStep < steps.length - 1 ? (
          <Button onClick={handleNext} variant="contained">
            Next
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create User'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DynamicUserForm;
