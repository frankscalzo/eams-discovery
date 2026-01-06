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
  Autocomplete,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  FormHelperText
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { 
  USER_TYPES, 
  getUserTypeInfo, 
  getAvailableUserTypes,
  canManageUsers,
  isPrimaryCompanyUser 
} from '../constants/userTypes';
import enhancedUserAPI from '../services/enhancedUserAPI';
import { useBffAuth } from '../contexts/BffAuthContext';

const EnhancedUserForm = ({ open, onClose, user, onSuccess }) => {
  const { user: currentUser } = useBffAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    // Basic Information
    firstName: '',
    lastName: '',
    email: '',
    
    // User Type and Permissions
    userType: USER_TYPES.COMPANY_STANDARD_USER,
    isPrimaryCompany: false,
    
    // Company Assignment
    assignedCompanyId: '',
    primaryCompanyId: '',
    companyAccess: [],
    
    // Project Assignment
    assignedProjects: [],
    
    // Security Settings
    requireMFA: false,
    isActive: true,
    
    // Password Settings
    password: '',
    temporaryPassword: '',
    sendWelcomeEmail: true
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [companies, setCompanies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [availableUserTypes, setAvailableUserTypes] = useState([]);

  const isEdit = !!user;

  const steps = [
    'Basic Information',
    'User Type & Permissions',
    'Company Assignment',
    'Project Assignment',
    'Security Settings',
    'Review & Create'
  ];

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.FirstName || '',
        lastName: user.LastName || '',
        email: user.Email || '',
        userType: user.UserType || USER_TYPES.COMPANY_STANDARD_USER,
        isPrimaryCompany: user.IsPrimaryCompany || false,
        assignedCompanyId: user.AssignedCompanyId || '',
        primaryCompanyId: user.PrimaryCompanyId || '',
        companyAccess: user.CompanyAccess || [],
        assignedProjects: user.AssignedProjects || [],
        requireMFA: user.RequireMFA || false,
        isActive: user.IsActive !== false,
        password: '',
        temporaryPassword: '',
        sendWelcomeEmail: false
      });
    } else {
      resetForm();
    }
    setErrors({});
    loadData();
  }, [user, open]);

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      userType: USER_TYPES.COMPANY_STANDARD_USER,
      isPrimaryCompany: false,
      assignedCompanyId: '',
      primaryCompanyId: '',
      companyAccess: [],
      assignedProjects: [],
      requireMFA: false,
      isActive: true,
      password: '',
      temporaryPassword: '',
      sendWelcomeEmail: true
    });
  };

  const loadData = async () => {
    try {
      // Load available user types based on current user permissions
      const availableTypes = getAvailableUserTypes(currentUser);
      setAvailableUserTypes(availableTypes);
      
      // Load companies
      const companiesResult = await enhancedUserAPI.getCompaniesForAssignment(currentUser);
      if (companiesResult.success) {
        setCompanies(companiesResult.companies);
      }
      
      // Set default company assignment based on current user
      if (!isEdit && currentUser) {
        if (isPrimaryCompanyUser(currentUser)) {
          setFormData(prev => ({
            ...prev,
            isPrimaryCompany: true,
            primaryCompanyId: currentUser.PrimaryCompanyId || 'primary-company'
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            assignedCompanyId: currentUser.AssignedCompanyId || currentUser.PrimaryCompanyId
          }));
        }
      }
    } catch (error) {
      console.error('Error loading form data:', error);
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 0: // Basic Information
        if (!formData.firstName.trim()) {
          newErrors.firstName = 'First name is required';
        }
        if (!formData.lastName.trim()) {
          newErrors.lastName = 'Last name is required';
        }
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'Email is invalid';
        }
        break;
        
      case 1: // User Type & Permissions
        if (!formData.userType) {
          newErrors.userType = 'User type is required';
        }
        break;
        
      case 2: // Company Assignment
        if (!formData.isPrimaryCompany && !formData.assignedCompanyId) {
          newErrors.assignedCompanyId = 'Company assignment is required for non-primary company users';
        }
        break;
        
      case 3: // Project Assignment
        // Project assignment is optional
        break;
        
      case 4: // Security Settings
        // Security settings are optional
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
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

  const handleUserTypeChange = (userType) => {
    const userInfo = getUserTypeInfo(userType);
    setFormData(prev => ({
      ...prev,
      userType,
      isPrimaryCompany: userInfo.isPrimaryCompany
    }));
  };

  const handleCompanyAccessChange = (companyId, level) => {
    setFormData(prev => {
      const existingAccess = prev.companyAccess.filter(access => access.companyId !== companyId);
      if (level !== 'no_access') {
        existingAccess.push({ companyId, level });
      }
      return {
        ...prev,
        companyAccess: existingAccess
      };
    });
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) {
      return;
    }

    try {
      setLoading(true);
      
      const userData = {
        ...formData,
        createdBy: currentUser.UserID,
        temporaryPassword: formData.temporaryPassword || enhancedUserAPI.generateTemporaryPassword()
      };

      let result;
      if (isEdit) {
        result = await enhancedUserAPI.updateUser(user.UserID, userData, currentUser);
      } else {
        result = await enhancedUserAPI.createUser(userData, currentUser);
      }

      if (result.success) {
        onSuccess?.(result.user || result.message);
        onClose(true);
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInformation = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
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
      <Grid item xs={12} sm={6}>
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
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          error={!!errors.email}
          helperText={errors.email}
          required
        />
      </Grid>
    </Grid>
  );

  const renderUserTypeSelection = () => {
    const userInfo = getUserTypeInfo(formData.userType);
    
    return (
      <Box>
        <FormControl fullWidth error={!!errors.userType}>
          <InputLabel>User Type</InputLabel>
          <Select
            value={formData.userType}
            onChange={(e) => handleUserTypeChange(e.target.value)}
            label="User Type"
          >
            {availableUserTypes.map(userType => {
              const info = getUserTypeInfo(userType);
              return (
                <MenuItem key={userType} value={userType}>
                  <Box>
                    <Typography variant="body1">{info.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {info.description}
                    </Typography>
                  </Box>
                </MenuItem>
              );
            })}
          </Select>
          {errors.userType && <FormHelperText>{errors.userType}</FormHelperText>}
        </FormControl>

        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <InfoIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Selected Role Details</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {userInfo.description}
            </Typography>
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>Permissions:</Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {userInfo.permissions.map(permission => (
                  <Chip key={permission} label={permission} size="small" />
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  const renderCompanyAssignment = () => (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={formData.isPrimaryCompany}
            onChange={(e) => handleInputChange('isPrimaryCompany', e.target.checked)}
            disabled={!isPrimaryCompanyUser(currentUser)}
          />
        }
        label="Primary Company User"
      />
      
      {formData.isPrimaryCompany ? (
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Primary Company</InputLabel>
          <Select
            value={formData.primaryCompanyId}
            onChange={(e) => handleInputChange('primaryCompanyId', e.target.value)}
            label="Primary Company"
          >
            {companies.filter(c => c.isPrimary).map(company => (
              <MenuItem key={company.id} value={company.id}>
                {company.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : (
        <FormControl fullWidth sx={{ mt: 2 }} error={!!errors.assignedCompanyId}>
          <InputLabel>Assigned Company</InputLabel>
          <Select
            value={formData.assignedCompanyId}
            onChange={(e) => handleInputChange('assignedCompanyId', e.target.value)}
            label="Assigned Company"
          >
            {companies.filter(c => !c.isPrimary).map(company => (
              <MenuItem key={company.id} value={company.id}>
                {company.name}
              </MenuItem>
            ))}
          </Select>
          {errors.assignedCompanyId && <FormHelperText>{errors.assignedCompanyId}</FormHelperText>}
        </FormControl>
      )}

      {/* Company Access for Primary Company Super Users */}
      {formData.isPrimaryCompany && formData.userType === USER_TYPES.PRIMARY_SUPER_USER && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>Additional Company Access</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Grant access to specific companies (optional)
          </Typography>
          {companies.filter(c => !c.isPrimary).map(company => (
            <Box key={company.id} display="flex" alignItems="center" justifyContent="space-between" py={1}>
              <Typography variant="body2">{company.name}</Typography>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={formData.companyAccess.find(access => access.companyId === company.id)?.level || 'no_access'}
                  onChange={(e) => handleCompanyAccessChange(company.id, e.target.value)}
                >
                  <MenuItem value="no_access">No Access</MenuItem>
                  <MenuItem value="read_only_access">Read Only</MenuItem>
                  <MenuItem value="limited_access">Limited Access</MenuItem>
                  <MenuItem value="full_access">Full Access</MenuItem>
                </Select>
              </FormControl>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );

  const renderProjectAssignment = () => (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Assign user to specific projects (optional)
      </Typography>
      <Autocomplete
        multiple
        options={projects}
        getOptionLabel={(option) => option.name || option}
        value={formData.assignedProjects}
        onChange={(event, newValue) => handleInputChange('assignedProjects', newValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Assigned Projects"
            placeholder="Select projects"
          />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              variant="outlined"
              label={option.name || option}
              {...getTagProps({ index })}
            />
          ))
        }
      />
    </Box>
  );

  const renderSecuritySettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.requireMFA}
              onChange={(e) => handleInputChange('requireMFA', e.target.checked)}
            />
          }
          label="Require Multi-Factor Authentication (MFA)"
        />
        <Typography variant="caption" color="text.secondary" display="block">
          User will be required to set up MFA on first login
        </Typography>
      </Grid>
      
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
            />
          }
          label="Active User"
        />
        <Typography variant="caption" color="text.secondary" display="block">
          Inactive users cannot log in to the system
        </Typography>
      </Grid>

      {!isEdit && (
        <>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Password (optional)"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              helperText="Leave empty to generate a temporary password"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.sendWelcomeEmail}
                  onChange={(e) => handleInputChange('sendWelcomeEmail', e.target.checked)}
                />
              }
              label="Send Welcome Email"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Send login instructions and temporary password via email
            </Typography>
          </Grid>
        </>
      )}
    </Grid>
  );

  const renderReview = () => {
    const userInfo = getUserTypeInfo(formData.userType);
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>Review User Details</Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Name</Typography>
            <Typography variant="body1">{formData.firstName} {formData.lastName}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Email</Typography>
            <Typography variant="body1">{formData.email}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">User Type</Typography>
            <Typography variant="body1">{userInfo.name}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Company</Typography>
            <Typography variant="body1">
              {formData.isPrimaryCompany ? 'Primary Company' : 
               companies.find(c => c.id === formData.assignedCompanyId)?.name || 'Not assigned'}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">Permissions</Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {userInfo.permissions.map(permission => (
                <Chip key={permission} label={permission} size="small" />
              ))}
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return renderBasicInformation();
      case 1:
        return renderUserTypeSelection();
      case 2:
        return renderCompanyAssignment();
      case 3:
        return renderProjectAssignment();
      case 4:
        return renderSecuritySettings();
      case 5:
        return renderReview();
      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <PeopleIcon sx={{ mr: 1 }} />
          {isEdit ? 'Edit User' : 'Create New User'}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {errors.submit && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.submit}
          </Alert>
        )}

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {renderStepContent(index)}
                <Box sx={{ mb: 2 }}>
                  <div>
                    <Button
                      variant="contained"
                      onClick={index === steps.length - 1 ? handleSubmit : handleNext}
                      sx={{ mt: 1, mr: 1 }}
                      disabled={loading}
                    >
                      {index === steps.length - 1 ? (isEdit ? 'Update User' : 'Create User') : 'Next'}
                    </Button>
                    <Button
                      disabled={index === 0}
                      onClick={handleBack}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      Back
                    </Button>
                  </div>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EnhancedUserForm;

