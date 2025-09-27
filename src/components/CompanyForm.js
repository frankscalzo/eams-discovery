import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress
} from '@mui/material';
import {
  Add,
  Delete,
  CloudUpload,
  Business,
  Person,
  Settings,
  AttachFile,
  Image,
  Save,
  Cancel
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import companyAPI from '../services/companyAPI';
import teamsAPI from '../services/teamsAPI';
import confluenceAPI from '../services/confluenceAPI';

const CompanyForm = ({ company, onSave, onCancel, mode = 'create' }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    CompanyName: '',
    State: '',
    Address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    },
    ProjectManager: {
      name: '',
      email: '',
      phone: ''
    },
    ExecutiveSponsor: {
      name: '',
      email: '',
      phone: ''
    },
    IntegrationSettings: {
      teams: {
        enabled: false,
        webhookUrl: '',
        channelName: '',
        botId: ''
      },
      confluence: {
        enabled: false,
        url: '',
        username: '',
        apiToken: '',
        spaceKey: ''
      }
    },
    CompanyLogo: null,
    CompanyDistribution: {
      type: 'internal',
      distributionList: []
    },
    ProjectLocation: 'AWS',
    ServiceNowProjectCode: '',
    SageProjectCode: '',
    Notes: '',
    CompanyFiles: []
  });

  const [newDistributionEmail, setNewDistributionEmail] = useState('');
  const [fileUploadDialog, setFileUploadDialog] = useState(false);
  const [newFile, setNewFile] = useState(null);
  const [fileDescription, setFileDescription] = useState('');
  const [fileType, setFileType] = useState('Other');

  useEffect(() => {
    if (company && mode === 'edit') {
      setFormData({
        ...company,
        CompanyFiles: company.CompanyFiles || []
      });
    }
  }, [company, mode]);

  const steps = [
    'Basic Information',
    'Contact Details',
    'Integration Settings',
    'Project Configuration',
    'Files & Documents'
  ];

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      if (mode === 'create') {
        const result = await companyAPI.createCompany({
          ...formData,
          CreatedBy: 'current-user' // This should come from auth context
        });
        
        if (result.success) {
          setNotifications(prev => [...prev, {
            id: Date.now(),
            type: 'success',
            message: 'Company created successfully!',
            timestamp: new Date()
          }]);
          
          if (onSave) {
            onSave(result.company);
          }
        } else {
          throw new Error(result.error);
        }
      } else {
        const result = await companyAPI.updateCompany(company.CompanyID, formData);
        
        if (result.success) {
          setNotifications(prev => [...prev, {
            id: Date.now(),
            type: 'success',
            message: 'Company updated successfully!',
            timestamp: new Date()
          }]);
          
          if (onSave) {
            onSave({ ...company, ...formData });
          }
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      console.error('Error saving company:', error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `Failed to save company: ${error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!newFile) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      const result = await companyAPI.uploadCompanyFile(
        company?.CompanyID || 'temp',
        newFile,
        fileType,
        fileDescription
      );

      if (result.success) {
        setFormData(prev => ({
          ...prev,
          CompanyFiles: [...prev.CompanyFiles, result.file]
        }));

        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'success',
          message: `File "${newFile.name}" uploaded successfully!`,
          timestamp: new Date()
        }]);

        setFileUploadDialog(false);
        setNewFile(null);
        setFileDescription('');
        setFileType('Other');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `Failed to upload file: ${error.message}`,
        timestamp: new Date()
      }];
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteFile = (fileId) => {
    setFormData(prev => ({
      ...prev,
      CompanyFiles: prev.CompanyFiles.filter(file => file.FileID !== fileId)
    }));
  };

  const addDistributionEmail = () => {
    if (newDistributionEmail && !formData.CompanyDistribution.distributionList.includes(newDistributionEmail)) {
      setFormData(prev => ({
        ...prev,
        CompanyDistribution: {
          ...prev.CompanyDistribution,
          distributionList: [...prev.CompanyDistribution.distributionList, newDistributionEmail]
        }
      }));
      setNewDistributionEmail('');
    }
  };

  const removeDistributionEmail = (email) => {
    setFormData(prev => ({
      ...prev,
      CompanyDistribution: {
        ...prev.CompanyDistribution,
        distributionList: prev.CompanyDistribution.distributionList.filter(e => e !== email)
      }
    }));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setNewFile(acceptedFiles[0]);
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg']
    },
    maxFiles: 1
  });

  const renderBasicInformation = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Company Name"
          value={formData.CompanyName}
          onChange={(e) => handleInputChange('CompanyName', e.target.value)}
          required
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="State"
          value={formData.State}
          onChange={(e) => handleInputChange('State', e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Address
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Street Address"
          value={formData.Address.street}
          onChange={(e) => handleInputChange('Address.street', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="City"
          value={formData.Address.city}
          onChange={(e) => handleInputChange('Address.city', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="State"
          value={formData.Address.state}
          onChange={(e) => handleInputChange('Address.state', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="ZIP Code"
          value={formData.Address.zipCode}
          onChange={(e) => handleInputChange('Address.zipCode', e.target.value)}
        />
      </Grid>
    </Grid>
  );

  const renderContactDetails = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Project Manager
        </Typography>
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Name"
          value={formData.ProjectManager.name}
          onChange={(e) => handleInputChange('ProjectManager.name', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={formData.ProjectManager.email}
          onChange={(e) => handleInputChange('ProjectManager.email', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Phone"
          value={formData.ProjectManager.phone}
          onChange={(e) => handleInputChange('ProjectManager.phone', e.target.value)}
        />
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Executive Sponsor
        </Typography>
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Name"
          value={formData.ExecutiveSponsor.name}
          onChange={(e) => handleInputChange('ExecutiveSponsor.name', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={formData.ExecutiveSponsor.email}
          onChange={(e) => handleInputChange('ExecutiveSponsor.email', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Phone"
          value={formData.ExecutiveSponsor.phone}
          onChange={(e) => handleInputChange('ExecutiveSponsor.phone', e.target.value)}
        />
      </Grid>
    </Grid>
  );

  const renderIntegrationSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Microsoft Teams Integration
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={formData.IntegrationSettings.teams.enabled}
              onChange={(e) => handleInputChange('IntegrationSettings.teams.enabled', e.target.checked)}
            />
          }
          label="Enable Teams Integration"
        />
      </Grid>
      
      {formData.IntegrationSettings.teams.enabled && (
        <>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Teams Webhook URL"
              value={formData.IntegrationSettings.teams.webhookUrl}
              onChange={(e) => handleInputChange('IntegrationSettings.teams.webhookUrl', e.target.value)}
              placeholder="https://your-org.webhook.office.com/webhookb2/..."
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Channel Name"
              value={formData.IntegrationSettings.teams.channelName}
              onChange={(e) => handleInputChange('IntegrationSettings.teams.channelName', e.target.value)}
              placeholder="EAMS-CompanyName"
            />
          </Grid>
        </>
      )}

      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          Confluence Integration
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={formData.IntegrationSettings.confluence.enabled}
              onChange={(e) => handleInputChange('IntegrationSettings.confluence.enabled', e.target.checked)}
            />
          }
          label="Enable Confluence Integration"
        />
      </Grid>
      
      {formData.IntegrationSettings.confluence.enabled && (
        <>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Confluence URL"
              value={formData.IntegrationSettings.confluence.url}
              onChange={(e) => handleInputChange('IntegrationSettings.confluence.url', e.target.value)}
              placeholder="https://your-org.atlassian.net"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Username"
              value={formData.IntegrationSettings.confluence.username}
              onChange={(e) => handleInputChange('IntegrationSettings.confluence.username', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="API Token"
              type="password"
              value={formData.IntegrationSettings.confluence.apiToken}
              onChange={(e) => handleInputChange('IntegrationSettings.confluence.apiToken', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Space Key"
              value={formData.IntegrationSettings.confluence.spaceKey}
              onChange={(e) => handleInputChange('IntegrationSettings.confluence.spaceKey', e.target.value)}
              placeholder="EAMS"
            />
          </Grid>
        </>
      )}
    </Grid>
  );

  const renderProjectConfiguration = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Project Location</InputLabel>
          <Select
            value={formData.ProjectLocation}
            onChange={(e) => handleInputChange('ProjectLocation', e.target.value)}
          >
            <MenuItem value="AWS">AWS</MenuItem>
            <MenuItem value="Azure">Azure</MenuItem>
            <MenuItem value="On-Premises">On-Premises</MenuItem>
            <MenuItem value="Google Cloud">Google Cloud</MenuItem>
            <MenuItem value="Multi-Cloud">Multi-Cloud</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Distribution Type</InputLabel>
          <Select
            value={formData.CompanyDistribution.type}
            onChange={(e) => handleInputChange('CompanyDistribution.type', e.target.value)}
          >
            <MenuItem value="internal">Internal Only</MenuItem>
            <MenuItem value="external">External Only</MenuItem>
            <MenuItem value="both">Both Internal & External</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Distribution List
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            label="Email Address"
            value={newDistributionEmail}
            onChange={(e) => setNewDistributionEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addDistributionEmail()}
            size="small"
          />
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={addDistributionEmail}
            disabled={!newDistributionEmail}
          >
            Add
          </Button>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {formData.CompanyDistribution.distributionList.map((email, index) => (
            <Chip
              key={index}
              label={email}
              onDelete={() => removeDistributionEmail(email)}
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="ServiceNow Project Code"
          value={formData.ServiceNowProjectCode}
          onChange={(e) => handleInputChange('ServiceNowProjectCode', e.target.value)}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Sage Project Code"
          value={formData.SageProjectCode}
          onChange={(e) => handleInputChange('SageProjectCode', e.target.value)}
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Notes"
          multiline
          rows={4}
          value={formData.Notes}
          onChange={(e) => handleInputChange('Notes', e.target.value)}
          placeholder="Additional notes about the company..."
        />
      </Grid>
    </Grid>
  );

  const renderFilesAndDocuments = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Company Files & Documents
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setFileUploadDialog(true)}
          >
            Upload File
          </Button>
        </Box>
      </Grid>

      {formData.CompanyFiles.length === 0 ? (
        <Grid item xs={12}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <AttachFile sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body1" color="text.secondary">
              No files uploaded yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload SOW, charter, contracts, and other company-specific documents
            </Typography>
          </Paper>
        </Grid>
      ) : (
        <Grid item xs={12}>
          <List>
            {formData.CompanyFiles.map((file, index) => (
              <ListItem key={file.FileID}>
                <ListItemText
                  primary={file.FileName}
                  secondary={`${file.FileType} • ${(file.FileSize / 1024).toFixed(1)} KB • ${new Date(file.UploadedAt).toLocaleDateString()}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleDeleteFile(file.FileID)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Grid>
      )}
    </Grid>
  );

  return (
    <Box>
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

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">
              {mode === 'create' ? 'Create New Company' : 'Edit Company'}
            </Typography>
            <Box>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={onCancel}
                sx={{ mr: 1 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </Box>
          </Box>

          <Stepper activeStep={activeStep} orientation="vertical">
            <Step>
              <StepLabel>Basic Information</StepLabel>
              <StepContent>
                {renderBasicInformation()}
                <Box sx={{ mt: 2 }}>
                  <Button onClick={handleNext}>
                    Next
                  </Button>
                </Box>
              </StepContent>
            </Step>

            <Step>
              <StepLabel>Contact Details</StepLabel>
              <StepContent>
                {renderContactDetails()}
                <Box sx={{ mt: 2 }}>
                  <Button onClick={handleBack} sx={{ mr: 1 }}>
                    Back
                  </Button>
                  <Button onClick={handleNext}>
                    Next
                  </Button>
                </Box>
              </StepContent>
            </Step>

            <Step>
              <StepLabel>Integration Settings</StepLabel>
              <StepContent>
                {renderIntegrationSettings()}
                <Box sx={{ mt: 2 }}>
                  <Button onClick={handleBack} sx={{ mr: 1 }}>
                    Back
                  </Button>
                  <Button onClick={handleNext}>
                    Next
                  </Button>
                </Box>
              </StepContent>
            </Step>

            <Step>
              <StepLabel>Project Configuration</StepLabel>
              <StepContent>
                {renderProjectConfiguration()}
                <Box sx={{ mt: 2 }}>
                  <Button onClick={handleBack} sx={{ mr: 1 }}>
                    Back
                  </Button>
                  <Button onClick={handleNext}>
                    Next
                  </Button>
                </Box>
              </StepContent>
            </Step>

            <Step>
              <StepLabel>Files & Documents</StepLabel>
              <StepContent>
                {renderFilesAndDocuments()}
                <Box sx={{ mt: 2 }}>
                  <Button onClick={handleBack} sx={{ mr: 1 }}>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Company'}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </CardContent>
      </Card>

      {/* File Upload Dialog */}
      <Dialog
        open={fileUploadDialog}
        onClose={() => setFileUploadDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Company File</DialogTitle>
        <DialogContent>
          <Paper
            {...getRootProps()}
            sx={{
              p: 3,
              textAlign: 'center',
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
              cursor: 'pointer',
              mb: 2
            }}
          >
            <input {...getInputProps()} />
            <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop file here' : 'Drag & drop file here'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to select file
            </Typography>
          </Paper>

          {newFile && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                Selected: {newFile.name}
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>File Type</InputLabel>
                <Select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                >
                  <MenuItem value="SOW">Statement of Work</MenuItem>
                  <MenuItem value="Charter">Project Charter</MenuItem>
                  <MenuItem value="Contract">Contract</MenuItem>
                  <MenuItem value="Logo">Company Logo</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
              />
            </Box>
          )}

          {uploading && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Uploading file...
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFileUploadDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleFileUpload}
            variant="contained"
            disabled={!newFile || uploading}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompanyForm;
