import React, { useState } from 'react';
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
  Box
} from '@mui/material';
import awsDataService from '../services/awsDataService';
import { useAuth } from '../contexts/AuthContext';

const SimpleCompanyForm = ({ open, onClose, onSuccess }) => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    size: 'Small',
    location: '',
    contactEmail: '',
    contactPhone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      if (!formData.name || !formData.contactEmail) {
        throw new Error('Company name and contact email are required');
      }

      // Create company
      const result = await awsDataService.createCompany({
        ...formData,
        type: 'client',
        status: 'Active'
      }, currentUser);

      if (!result.success) {
        throw new Error(result.error);
      }

      const newCompany = result.company;

      console.log('Company created:', newCompany);
      
      // Reset form
      setFormData({
        name: '',
        industry: '',
        size: 'Small',
        location: '',
        contactEmail: '',
        contactPhone: ''
      });

      onSuccess?.(newCompany);
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
      industry: '',
      size: 'Small',
      location: '',
      contactEmail: '',
      contactPhone: ''
    });
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Create New Company</Typography>
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
                label="Company Name *"
                value={formData.name}
                onChange={handleChange('name')}
                fullWidth
                required
                placeholder="Enter company name"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Industry"
                value={formData.industry}
                onChange={handleChange('industry')}
                fullWidth
                placeholder="e.g., Healthcare, Technology"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Company Size"
                value={formData.size}
                onChange={handleChange('size')}
                fullWidth
                select
                SelectProps={{ native: true }}
              >
                <option value="Small">Small (1-50 employees)</option>
                <option value="Medium">Medium (51-200 employees)</option>
                <option value="Large">Large (201-1000 employees)</option>
                <option value="Enterprise">Enterprise (1000+ employees)</option>
              </TextField>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Location"
                value={formData.location}
                onChange={handleChange('location')}
                fullWidth
                placeholder="e.g., New York, NY"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact Email *"
                type="email"
                value={formData.contactEmail}
                onChange={handleChange('contactEmail')}
                fullWidth
                required
                placeholder="contact@company.com"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact Phone"
                value={formData.contactPhone}
                onChange={handleChange('contactPhone')}
                fullWidth
                placeholder="(555) 123-4567"
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
            {loading ? 'Creating...' : 'Create Company'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SimpleCompanyForm;
