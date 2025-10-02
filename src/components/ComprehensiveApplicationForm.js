import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CloudUpload as UploadIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Timeline as TimelineIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useProject } from '../contexts/ProjectContext';
import mockAPI from '../services/mockAPI';

const ComprehensiveApplicationForm = ({ applicationId, onSave, onCancel }) => {
  const { currentProject } = useProject();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  // Main application data
  const [formData, setFormData] = useState({
    // Basic Information
    applicationName: '',
    applicationDescription: '',
    applicationId: '',
    
    // Team Information
    teams: [],
    owner: { fullName: '', email: '' },
    manager: { fullName: '', email: '' },
    
    // Project Information
    epicTicket: '',
    slgTicket: '',
    chgTicket: '',
    
    // Testing Information
    testPlanReady: false,
    testingStatus: 'NOT_STARTED',
    confidence: 0,
    testingNotes: '',
    
    // Integration Information
    integrationType: '',
    integrationDetails: [],
    
    // Business Information
    roi: 0,
    rto: 0,
    rpo: 0,
    
    // Discovery Questions
    discoveryQuestions: {
      vendorIaaS: false,
      vendorSaaS: false,
      licenseIssues: false,
      integrations: [],
      externalVendors: false,
      hardcodedIPs: false,
      authentication: '',
      accessMethod: '',
      mfaIntegration: false,
      environments: [],
      upcomingChanges: '',
      latencySensitivity: false
    },
    
    // EAMS Data Validation
    leanixData: {
      applicationName: '',
      applicationDescription: '',
      applicationOwner: '',
      applicationDirector: '',
      applicationSupportGroup: '',
      criticality: '',
      containsPHI: false,
      vendorName: '',
      vendorContact: '',
      longTermGoal: ''
    },
    
    // Technical Specifications
    technicalSpecs: {
      platform: '',
      technology: [],
      hosting: '',
      database: '',
      middleware: [],
      security: []
    },
    
    // Business Value
    businessValue: {
      businessCapability: '',
      users: 0,
      revenue: 0,
      cost: 0,
      strategicImportance: ''
    }
  });

  const [newTeam, setNewTeam] = useState('');
  const [newIntegration, setNewIntegration] = useState({ type: '', details: '' });
  const [newEnvironment, setNewEnvironment] = useState('');

  const steps = [
    'Basic Information',
    'Team & Ownership',
    'Testing & Quality',
    'Integration Details',
    'Business Value',
    'Discovery Questions',
    'Technical Specifications',
    'Review & Save'
  ];

  const testingStatusOptions = [
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED',
    'ON_HOLD'
  ];

  const integrationTypes = [
    'API',
    'DATABASE',
    'FILE_TRANSFER',
    'MESSAGE_QUEUE',
    'WEB_SERVICE',
    'DIRECT_INTEGRATION',
    'OTHER'
  ];

  const criticalityLevels = [
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
  ];

  const longTermGoals = [
    'INVEST',
    'MAINTAIN',
    'DEPRECATE',
    'REPLACE'
  ];

  const platforms = [
    'AWS',
    'Azure',
    'Google Cloud',
    'On-Premise',
    'Hybrid',
    'Other'
  ];

  const hostingOptions = [
    'CLOUD',
    'ON_PREMISE',
    'HYBRID',
    'SAAS'
  ];

  const authenticationMethods = [
    'Active Directory',
    'Local Authentication',
    'Modern Auth (OAuth/SAML)',
    'Multi-Factor Authentication',
    'Single Sign-On',
    'Other'
  ];

  const accessMethods = [
    'Direct Website',
    'Citrix',
    'Client-Server',
    'Mobile App',
    'API',
    'Other'
  ];

  const environments = [
    'Production',
    'Development',
    'Test',
    'Staging',
    'UAT',
    'DR'
  ];

  useEffect(() => {
    if (applicationId) {
      loadApplication();
    }
  }, [applicationId]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      const application = await mockAPI.applications.getApplication(applicationId);
      if (application) {
        setFormData(application);
      }
    } catch (error) {
      console.error('Error loading application:', error);
      setError('Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (parentField, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [field]: value
      }
    }));
  };

  const handleArrayAdd = (field, value) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }));
    }
  };

  const handleArrayRemove = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleIntegrationAdd = () => {
    if (newIntegration.type && newIntegration.details) {
      setFormData(prev => ({
        ...prev,
        integrationDetails: [...prev.integrationDetails, newIntegration]
      }));
      setNewIntegration({ type: '', details: '' });
    }
  };

  const handleIntegrationRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      integrationDetails: prev.integrationDetails.filter((_, i) => i !== index)
    }));
  };

  const handleEnvironmentAdd = () => {
    if (newEnvironment) {
      setFormData(prev => ({
        ...prev,
        discoveryQuestions: {
          ...prev.discoveryQuestions,
          environments: [...prev.discoveryQuestions.environments, newEnvironment]
        }
      }));
      setNewEnvironment('');
    }
  };

  const handleEnvironmentRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      discoveryQuestions: {
        ...prev.discoveryQuestions,
        environments: prev.discoveryQuestions.environments.filter((_, i) => i !== index)
      }
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const applicationData = {
        ...formData,
        projectId: currentProject.id,
        updatedAt: new Date().toISOString()
      };

      if (applicationId) {
        await mockAPI.applications.updateApplication(applicationId, applicationData);
      } else {
        await mockAPI.applications.createApplication(applicationData);
      }

      onSave?.(applicationData);
    } catch (error) {
      console.error('Error saving application:', error);
      setError('Failed to save application');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderBasicInformation = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Basic Information
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Application Name"
              value={formData.applicationName}
              onChange={(e) => handleInputChange('applicationName', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Application ID"
              value={formData.applicationId}
              onChange={(e) => handleInputChange('applicationId', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Application Description"
              value={formData.applicationDescription}
              onChange={(e) => handleInputChange('applicationDescription', e.target.value)}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderTeamInformation = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Team & Ownership
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Owner Full Name"
              value={formData.owner.fullName}
              onChange={(e) => handleNestedInputChange('owner', 'fullName', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Owner Email"
              type="email"
              value={formData.owner.email}
              onChange={(e) => handleNestedInputChange('owner', 'email', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Manager Full Name"
              value={formData.manager.fullName}
              onChange={(e) => handleNestedInputChange('manager', 'fullName', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Manager Email"
              type="email"
              value={formData.manager.email}
              onChange={(e) => handleNestedInputChange('manager', 'email', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Teams
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
              {formData.teams.map((team, index) => (
                <Chip
                  key={index}
                  label={team}
                  onDelete={() => handleArrayRemove('teams', index)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
            <Box display="flex" gap={1}>
              <TextField
                size="small"
                placeholder="Add team"
                value={newTeam}
                onChange={(e) => setNewTeam(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleArrayAdd('teams', newTeam);
                    setNewTeam('');
                  }
                }}
              />
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  handleArrayAdd('teams', newTeam);
                  setNewTeam('');
                }}
              >
                Add
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderTestingInformation = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Testing & Quality
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Epic/SLG/CHG Ticket #"
              value={formData.epicTicket}
              onChange={(e) => handleInputChange('epicTicket', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Testing Status</InputLabel>
              <Select
                value={formData.testingStatus}
                onChange={(e) => handleInputChange('testingStatus', e.target.value)}
              >
                {testingStatusOptions.map(option => (
                  <MenuItem key={option} value={option}>
                    {option.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Confidence %"
              type="number"
              value={formData.confidence}
              onChange={(e) => handleInputChange('confidence', parseInt(e.target.value) || 0)}
              inputProps={{ min: 0, max: 100 }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.testPlanReady}
                  onChange={(e) => handleInputChange('testPlanReady', e.target.checked)}
                />
              }
              label="Test Plan Ready?"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Testing Notes"
              value={formData.testingNotes}
              onChange={(e) => handleInputChange('testingNotes', e.target.value)}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderIntegrationDetails = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Integration Details
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Integration Type</InputLabel>
              <Select
                value={formData.integrationType}
                onChange={(e) => handleInputChange('integrationType', e.target.value)}
              >
                {integrationTypes.map(type => (
                  <MenuItem key={type} value={type}>
                    {type.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="ROI"
              type="number"
              value={formData.roi}
              onChange={(e) => handleInputChange('roi', parseInt(e.target.value) || 0)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="RTO (Recovery Time Objective)"
              type="number"
              value={formData.rto}
              onChange={(e) => handleInputChange('rto', parseInt(e.target.value) || 0)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="RPO (Recovery Point Objective)"
              type="number"
              value={formData.rpo}
              onChange={(e) => handleInputChange('rpo', parseInt(e.target.value) || 0)}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Integration Details
            </Typography>
            {formData.integrationDetails.map((integration, index) => (
              <Box key={index} display="flex" gap={1} mb={1} alignItems="center">
                <Chip label={integration.type} size="small" />
                <Typography variant="body2" flex={1}>
                  {integration.details}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleIntegrationRemove(index)}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Box display="flex" gap={1} mt={2}>
              <TextField
                size="small"
                placeholder="Integration Type"
                value={newIntegration.type}
                onChange={(e) => setNewIntegration(prev => ({ ...prev, type: e.target.value }))}
              />
              <TextField
                size="small"
                placeholder="Details"
                value={newIntegration.details}
                onChange={(e) => setNewIntegration(prev => ({ ...prev, details: e.target.value }))}
                sx={{ flex: 1 }}
              />
              <Button size="small" onClick={handleIntegrationAdd}>
                Add
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderDiscoveryQuestions = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Discovery Interview Questions
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Vendor & Migration Questions
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.discoveryQuestions.vendorIaaS}
                  onChange={(e) => handleNestedInputChange('discoveryQuestions', 'vendorIaaS', e.target.checked)}
                />
              }
              label="Does the vendor support running this application on IaaS within AWS?"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.discoveryQuestions.vendorSaaS}
                  onChange={(e) => handleNestedInputChange('discoveryQuestions', 'vendorSaaS', e.target.checked)}
                />
              }
              label="Does the vendor have a SaaS offering that could replace this application?"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.discoveryQuestions.licenseIssues}
                  onChange={(e) => handleNestedInputChange('discoveryQuestions', 'licenseIssues', e.target.checked)}
                />
              }
              label="Are there any License issues/considerations if this app is migrated to AWS?"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Integration & Security Questions
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.discoveryQuestions.externalVendors}
                  onChange={(e) => handleNestedInputChange('discoveryQuestions', 'externalVendors', e.target.checked)}
                />
              }
              label="Does this application communicate to any external vendors/systems that will require adjustments if migrated to AWS?"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.discoveryQuestions.hardcodedIPs}
                  onChange={(e) => handleNestedInputChange('discoveryQuestions', 'hardcodedIPs', e.target.checked)}
                />
              }
              label="Are you aware of any hardcoded IP configurations?"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.discoveryQuestions.mfaIntegration}
                  onChange={(e) => handleNestedInputChange('discoveryQuestions', 'mfaIntegration', e.target.checked)}
                />
              }
              label="Does this application have direct MFA integration?"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.discoveryQuestions.latencySensitivity}
                  onChange={(e) => handleNestedInputChange('discoveryQuestions', 'latencySensitivity', e.target.checked)}
                />
              }
              label="Are there any concerns around latency sensitivity?"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>How is user authentication handled?</InputLabel>
              <Select
                value={formData.discoveryQuestions.authentication}
                onChange={(e) => handleNestedInputChange('discoveryQuestions', 'authentication', e.target.value)}
              >
                {authenticationMethods.map(method => (
                  <MenuItem key={method} value={method}>
                    {method}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>How is this application accessed?</InputLabel>
              <Select
                value={formData.discoveryQuestions.accessMethod}
                onChange={(e) => handleNestedInputChange('discoveryQuestions', 'accessMethod', e.target.value)}
              >
                {accessMethods.map(method => (
                  <MenuItem key={method} value={method}>
                    {method}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Environments
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
              {formData.discoveryQuestions.environments.map((env, index) => (
                <Chip
                  key={index}
                  label={env}
                  onDelete={() => handleEnvironmentRemove(index)}
                  color="secondary"
                  variant="outlined"
                />
              ))}
            </Box>
            <Box display="flex" gap={1}>
              <FormControl fullWidth>
                <InputLabel>Add Environment</InputLabel>
                <Select
                  value={newEnvironment}
                  onChange={(e) => setNewEnvironment(e.target.value)}
                >
                  {environments.map(env => (
                    <MenuItem key={env} value={env}>
                      {env}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button onClick={handleEnvironmentAdd}>
                Add
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Are there any upcoming changes/upgrades planned for this application?"
              value={formData.discoveryQuestions.upcomingChanges}
              onChange={(e) => handleNestedInputChange('discoveryQuestions', 'upcomingChanges', e.target.value)}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderEAMSValidation = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          EAMS Data Validation
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Application Owner/Director"
              value={formData.leanixData.applicationOwner}
              onChange={(e) => handleNestedInputChange('leanixData', 'applicationOwner', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Application Support Group"
              value={formData.leanixData.applicationSupportGroup}
              onChange={(e) => handleNestedInputChange('leanixData', 'applicationSupportGroup', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Application Criticality/DR Tier</InputLabel>
              <Select
                value={formData.leanixData.criticality}
                onChange={(e) => handleNestedInputChange('leanixData', 'criticality', e.target.value)}
              >
                {criticalityLevels.map(level => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.leanixData.containsPHI}
                  onChange={(e) => handleNestedInputChange('leanixData', 'containsPHI', e.target.checked)}
                />
              }
              label="Does it contain PHI?"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Vendor Name & Point of Contact"
              value={formData.leanixData.vendorName}
              onChange={(e) => handleNestedInputChange('leanixData', 'vendorName', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Long Term Application Goal</InputLabel>
              <Select
                value={formData.leanixData.longTermGoal}
                onChange={(e) => handleNestedInputChange('leanixData', 'longTermGoal', e.target.value)}
              >
                {longTermGoals.map(goal => (
                  <MenuItem key={goal} value={goal}>
                    {goal}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderTechnicalSpecifications = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Technical Specifications
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Platform</InputLabel>
              <Select
                value={formData.technicalSpecs.platform}
                onChange={(e) => handleNestedInputChange('technicalSpecs', 'platform', e.target.value)}
              >
                {platforms.map(platform => (
                  <MenuItem key={platform} value={platform}>
                    {platform}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Hosting</InputLabel>
              <Select
                value={formData.technicalSpecs.hosting}
                onChange={(e) => handleNestedInputChange('technicalSpecs', 'hosting', e.target.value)}
              >
                {hostingOptions.map(option => (
                  <MenuItem key={option} value={option}>
                    {option.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Database"
              value={formData.technicalSpecs.database}
              onChange={(e) => handleNestedInputChange('technicalSpecs', 'database', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Strategic Importance"
              value={formData.businessValue.strategicImportance}
              onChange={(e) => handleNestedInputChange('businessValue', 'strategicImportance', e.target.value)}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderBusinessValue = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Business Value
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Business Capability"
              value={formData.businessValue.businessCapability}
              onChange={(e) => handleNestedInputChange('businessValue', 'businessCapability', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Number of Users"
              type="number"
              value={formData.businessValue.users}
              onChange={(e) => handleNestedInputChange('businessValue', 'users', parseInt(e.target.value) || 0)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Revenue Impact"
              type="number"
              value={formData.businessValue.revenue}
              onChange={(e) => handleNestedInputChange('businessValue', 'revenue', parseInt(e.target.value) || 0)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Cost"
              type="number"
              value={formData.businessValue.cost}
              onChange={(e) => handleNestedInputChange('businessValue', 'cost', parseInt(e.target.value) || 0)}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderReview = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Review & Save
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Please review all information before saving. This will create a comprehensive application record in the EAMS system.
        </Alert>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Application'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  const getStepContent = (step) => {
    switch (step) {
      case 0: return renderBasicInformation();
      case 1: return renderTeamInformation();
      case 2: return renderTestingInformation();
      case 3: return renderIntegrationDetails();
      case 4: return renderBusinessValue();
      case 5: return renderDiscoveryQuestions();
      case 6: return renderTechnicalSpecifications();
      case 7: return renderReview();
      default: return null;
    }
  };

  if (loading && applicationId) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading application...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
            <StepContent>
              {getStepContent(index)}
              <Box sx={{ mb: 2 }}>
                <div>
                  {index < steps.length - 1 && (
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(activeStep + 1)}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      Continue
                    </Button>
                  )}
                  {index > 0 && (
                    <Button
                      onClick={() => setActiveStep(activeStep - 1)}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      Back
                    </Button>
                  )}
                </div>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default ComprehensiveApplicationForm;
