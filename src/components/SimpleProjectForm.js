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
import { useBffAuth } from '../contexts/BffAuthContext';

const SimpleProjectForm = ({ open, onClose, onSuccess }) => {
  const { user: currentUser } = useBffAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    companyId: '',
    status: 'Planning',
    startDate: '',
    endDate: '',
    projectManager: '',
    budget: ''
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
            companyId: result.companies[0].CompanyID
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
      if (!formData.name || !formData.companyId) {
        throw new Error('Project name and company are required');
      }

      // Create project
      const result = await awsDataService.createProject({
        ...formData,
        status: 'Planning',
        createdAt: new Date().toISOString()
      }, currentUser);

      if (!result.success) {
        throw new Error(result.error);
      }

      const newProject = result.project;

      console.log('Project created:', newProject);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        companyId: '',
        status: 'Planning',
        startDate: '',
        endDate: '',
        projectManager: '',
        budget: ''
      });

      onSuccess?.(newProject);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      companyId: '',
      status: 'Planning',
      startDate: '',
      endDate: '',
      projectManager: '',
      budget: ''
    });
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Create New Project</Typography>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Project Name *"
                value={formData.name}
                onChange={handleChange('name')}
                fullWidth
                required
                placeholder="Enter project name"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={formData.description}
                onChange={handleChange('description')}
                fullWidth
                multiline
                rows={3}
                placeholder="Enter project description"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Company</InputLabel>
                <Select
                  value={formData.companyId}
                  onChange={handleChange('companyId')}
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
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={handleChange('status')}
                  label="Status"
                >
                  <MenuItem value="Planning">Planning</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="On Hold">On Hold</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={handleChange('startDate')}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={handleChange('endDate')}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Project Manager"
                value={formData.projectManager}
                onChange={handleChange('projectManager')}
                fullWidth
                placeholder="Enter project manager name"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Budget"
                type="number"
                value={formData.budget}
                onChange={handleChange('budget')}
                fullWidth
                placeholder="Enter budget amount"
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
            {loading ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SimpleProjectForm;
