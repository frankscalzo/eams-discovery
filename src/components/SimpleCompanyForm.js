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
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import awsDataService from '../services/awsDataService';
import { useBffAuth } from '../contexts/BffAuthContext';

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

const SimpleCompanyForm = ({ open, onClose, onSuccess }) => {
  const { user: currentUser } = useBffAuth();
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    size: 'Small',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    },
    contactEmail: '',
    contactPhone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'United States'
        },
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
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States'
      },
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
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Address
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
