import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useProject } from '../contexts/ProjectContext';
import mockAPI from '../services/mockAPI';

const ApplicationForm = () => {
  const { currentProject } = useProject();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    ApplicationName: '',
    ApplicationDescription: '',
    Owner: { fullName: '', email: '', phone: '' },
    Manager: { fullName: '', email: '', phone: '' },
    Teams: [],
    EpicSLGCHGTicket: '',
    TestPlanReady: false,
    TestingStatus: '',
    Confidence: 0,
    TestingNotes: '',
    IntegrationType: '',
    EAMSData: {
      criticality: '',
      vendor: '',
      vendorContact: '',
      longTermGoal: '',
      containsPHI: false,
      supportGroup: ''
    }
  });

  const [newTeam, setNewTeam] = useState('');

  useEffect(() => {
    if (isEdit) {
      loadApplication();
    }
  }, [id, isEdit]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      const application = await mockAPI.applications.getApplication(currentProject.id, id);
      setFormData(application);
    } catch (err) {
      console.error('Error loading application:', err);
      setError('Failed to load application');
    } finally {
      setLoading(false);
    }
  };

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

  const handleArrayAdd = (field, value, setter) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }));
      setter('');
    }
  };

  const handleArrayRemove = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (isEdit) {
        await mockAPI.applications.updateApplication(currentProject.id, id, formData);
        setSuccess('Application updated successfully');
      } else {
        await mockAPI.applications.createApplication(currentProject.id, formData);
        setSuccess('Application created successfully');
      }
      
      setTimeout(() => {
        navigate(`/projects/${currentProject.id}/applications`);
      }, 1500);
    } catch (err) {
      console.error('Error saving application:', err);
      setError('Failed to save application');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        {isEdit ? 'Edit Application' : 'Create New Application'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Basic Information</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Application Name"
                      value={formData.ApplicationName}
                      onChange={(e) => handleInputChange('ApplicationName', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Testing Status</InputLabel>
                      <Select
                        value={formData.TestingStatus}
                        onChange={(e) => handleInputChange('TestingStatus', e.target.value)}
                      >
                        <MenuItem value="Not Started">Not Started</MenuItem>
                        <MenuItem value="In Progress">In Progress</MenuItem>
                        <MenuItem value="Completed">Completed</MenuItem>
                        <MenuItem value="Failed">Failed</MenuItem>
                        <MenuItem value="On Hold">On Hold</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Application Description"
                      multiline
                      rows={3}
                      value={formData.ApplicationDescription}
                      onChange={(e) => handleInputChange('ApplicationDescription', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Epic SLG/CHG/Ticket #"
                      value={formData.EpicSLGCHGTicket}
                      onChange={(e) => handleInputChange('EpicSLGCHGTicket', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Confidence %"
                      type="number"
                      inputProps={{ min: 0, max: 100 }}
                      value={formData.Confidence}
                      onChange={(e) => handleInputChange('Confidence', parseInt(e.target.value) || 0)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.TestPlanReady}
                          onChange={(e) => handleInputChange('TestPlanReady', e.target.checked)}
                        />
                      }
                      label="Test Plan Ready"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Testing Notes"
                      multiline
                      rows={3}
                      value={formData.TestingNotes}
                      onChange={(e) => handleInputChange('TestingNotes', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* People & Teams */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">People & Teams</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>Application Owner</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Full Name"
                          value={formData.Owner.fullName}
                          onChange={(e) => handleInputChange('Owner.fullName', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Email"
                          type="email"
                          value={formData.Owner.email}
                          onChange={(e) => handleInputChange('Owner.email', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Phone"
                          value={formData.Owner.phone}
                          onChange={(e) => handleInputChange('Owner.phone', e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>Manager</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Full Name"
                          value={formData.Manager.fullName}
                          onChange={(e) => handleInputChange('Manager.fullName', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Email"
                          type="email"
                          value={formData.Manager.email}
                          onChange={(e) => handleInputChange('Manager.email', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Phone"
                          value={formData.Manager.phone}
                          onChange={(e) => handleInputChange('Manager.phone', e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>Teams</Typography>
                    <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                      {formData.Teams.map((team, index) => (
                        <Chip
                          key={index}
                          label={team}
                          onDelete={() => handleArrayRemove('Teams', index)}
                          color="primary"
                        />
                      ))}
                    </Box>
                    <Box display="flex" gap={1}>
                      <TextField
                        size="small"
                        label="Add Team"
                        value={newTeam}
                        onChange={(e) => setNewTeam(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleArrayAdd('Teams', newTeam, setNewTeam);
                          }
                        }}
                      />
                      <Button
                        variant="outlined"
                        onClick={() => handleArrayAdd('Teams', newTeam, setNewTeam)}
                        startIcon={<AddIcon />}
                      >
                        Add
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* EAMS Data */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">EAMS Data</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Criticality</InputLabel>
                      <Select
                        value={formData.EAMSData.criticality}
                        onChange={(e) => handleInputChange('EAMSData.criticality', e.target.value)}
                      >
                        <MenuItem value="Critical">Critical</MenuItem>
                        <MenuItem value="High">High</MenuItem>
                        <MenuItem value="Medium">Medium</MenuItem>
                        <MenuItem value="Low">Low</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Vendor Name"
                      value={formData.EAMSData.vendor}
                      onChange={(e) => handleInputChange('EAMSData.vendor', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Vendor Contact"
                      value={formData.EAMSData.vendorContact}
                      onChange={(e) => handleInputChange('EAMSData.vendorContact', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Long Term Goal</InputLabel>
                      <Select
                        value={formData.EAMSData.longTermGoal}
                        onChange={(e) => handleInputChange('EAMSData.longTermGoal', e.target.value)}
                      >
                        <MenuItem value="Invest">Invest</MenuItem>
                        <MenuItem value="Maintain">Maintain</MenuItem>
                        <MenuItem value="Deprecated">Deprecated</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Support Group"
                      value={formData.EAMSData.supportGroup}
                      onChange={(e) => handleInputChange('EAMSData.supportGroup', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.EAMSData.containsPHI}
                          onChange={(e) => handleInputChange('EAMSData.containsPHI', e.target.checked)}
                        />
                      }
                      label="Contains PHI"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box mt={4} display="flex" gap={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={() => navigate(`/projects/${currentProject.id}/applications`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={saving}
          >
            {saving ? 'Saving...' : (isEdit ? 'Update Application' : 'Create Application')}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default ApplicationForm;
