import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Link,
  Alert,
  CircularProgress,
  Grid,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  AttachFile as AttachFileIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Star as StarIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import UniversalDataView from './UniversalDataView';
import normalizedDataService, { NormalizedDataService } from '../services/normalizedDataService';

const CoTravelersRepository = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [coTravelers, setCoTravelers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCoTraveler, setEditingCoTraveler] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    industry: '',
    status: 'Active',
    description: '',
    contactInfo: {
      email: '',
      phone: '',
      website: ''
    },
    relationship: '',
    tags: [],
    links: []
  });

  const types = ['Partner', 'Vendor', 'Client', 'Supplier', 'Consultant', 'Other'];
  const industries = ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Education', 'Government', 'Other'];
  const statusOptions = ['Active', 'Inactive', 'Prospect', 'Former'];
  const relationshipTypes = ['Strategic Partner', 'Preferred Vendor', 'Key Client', 'Regular Supplier', 'Occasional Partner'];

  const columns = [
    { field: 'name', label: 'Name' },
    { field: 'type', label: 'Type' },
    { field: 'industry', label: 'Industry' },
    { field: 'status', label: 'Status' },
    { field: 'relationship', label: 'Relationship' },
    { field: 'lastUpdated', label: 'Last Updated' }
  ];

  const filterOptions = [
    { value: 'all', label: 'All Types' },
    ...types.map(type => ({ value: type, label: type }))
  ];

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'type', label: 'Type' },
    { value: 'industry', label: 'Industry' },
    { value: 'lastUpdated', label: 'Last Updated' },
    { value: 'status', label: 'Status' }
  ];

  const advancedFilters = [
    {
      field: 'type',
      label: 'Type',
      type: 'multiselect',
      options: types.map(type => ({ value: type, label: type }))
    },
    {
      field: 'status',
      label: 'Status',
      type: 'multiselect',
      options: statusOptions.map(status => ({ value: status, label: status }))
    },
    {
      field: 'industry',
      label: 'Industry',
      type: 'multiselect',
      options: industries.map(industry => ({ value: industry, label: industry }))
    },
    {
      field: 'name',
      label: 'Name',
      type: 'text',
      placeholder: 'Filter by name...'
    },
    {
      field: 'description',
      label: 'Description',
      type: 'text',
      placeholder: 'Filter by description...'
    },
    {
      field: 'contact.email',
      label: 'Email',
      type: 'text',
      placeholder: 'Filter by email...'
    },
    {
      field: 'contact.phone',
      label: 'Phone',
      type: 'text',
      placeholder: 'Filter by phone...'
    },
    {
      field: 'tags',
      label: 'Tags',
      type: 'multiselect',
      options: [
        { value: 'strategic', label: 'Strategic Partner' },
        { value: 'technology', label: 'Technology Partner' },
        { value: 'vendor', label: 'Vendor' },
        { value: 'consultant', label: 'Consultant' },
        { value: 'enterprise', label: 'Enterprise' },
        { value: 'startup', label: 'Startup' },
        { value: 'government', label: 'Government' },
        { value: 'nonprofit', label: 'Non-Profit' }
      ]
    },
    {
      field: 'lastUpdated',
      label: 'Last Updated',
      type: 'date'
    },
    {
      field: 'isTemplate',
      label: 'Template Only',
      type: 'boolean'
    }
  ];

  useEffect(() => {
    loadCoTravelers();
  }, []);

  const loadCoTravelers = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to load from normalized data service first
      const result = await normalizedDataService.getEntitiesByType(
        NormalizedDataService.ENTITY_TYPES.CO_TRAVELER
      );
      if (result && result.length > 0) {
        setCoTravelers(result);
      } else {
        // Fallback to sample data if no data found
        console.log('No data found, using sample data');
        setCoTravelers(getSampleCoTravelers());
      }
    } catch (err) {
      console.error('Error loading co-travelers:', err);
      setError('Failed to load co-travelers. Using sample data.');
      setCoTravelers(getSampleCoTravelers());
    } finally {
      setLoading(false);
    }
  };

  const getSampleCoTravelers = () => [
    {
      id: '1',
      name: 'Microsoft Corporation',
      type: 'Partner',
      industry: 'Technology',
      status: 'Active',
      description: 'Strategic technology partner providing cloud services and enterprise solutions.',
      contactInfo: {
        email: 'partnerships@microsoft.com',
        phone: '+1-425-882-8080',
        website: 'https://www.microsoft.com'
      },
      relationship: 'Strategic Partner',
      tags: ['cloud', 'enterprise', 'azure', 'office365'],
      links: [
        { type: 'url', label: 'Partner Portal', url: 'https://partner.microsoft.com' },
        { type: 'file', label: 'Partnership Agreement', fileId: 'microsoft-partnership.pdf', storage: 's3' }
      ],
      lastUpdated: '2024-01-15',
      createdBy: 'System Admin'
    },
    {
      id: '2',
      name: 'Accenture',
      type: 'Consultant',
      industry: 'Technology',
      status: 'Active',
      description: 'Global consulting firm specializing in digital transformation and technology services.',
      contactInfo: {
        email: 'client.services@accenture.com',
        phone: '+1-312-737-8000',
        website: 'https://www.accenture.com'
      },
      relationship: 'Preferred Vendor',
      tags: ['consulting', 'digital-transformation', 'technology', 'global'],
      links: [
        { type: 'url', label: 'Client Portal', url: 'https://client.accenture.com' },
        { type: 'file', label: 'Service Catalog', fileId: 'accenture-services.pdf', storage: 's3' }
      ],
      lastUpdated: '2024-01-12',
      createdBy: 'System Admin'
    },
    {
      id: '3',
      name: 'Deloitte',
      type: 'Consultant',
      industry: 'Finance',
      status: 'Active',
      description: 'Professional services firm providing audit, consulting, and advisory services.',
      contactInfo: {
        email: 'client.relations@deloitte.com',
        phone: '+1-212-492-4000',
        website: 'https://www2.deloitte.com'
      },
      relationship: 'Key Client',
      tags: ['audit', 'consulting', 'advisory', 'professional-services'],
      links: [
        { type: 'url', label: 'Client Portal', url: 'https://client.deloitte.com' },
        { type: 'file', label: 'Engagement Letter', fileId: 'deloitte-engagement.pdf', storage: 's3' }
      ],
      lastUpdated: '2024-01-10',
      createdBy: 'System Admin'
    }
  ];

  const handleAdd = () => {
    setEditingCoTraveler(null);
    setFormData({
      name: '',
      type: '',
      industry: '',
      status: 'Active',
      description: '',
      contactInfo: {
        email: '',
        phone: '',
        website: ''
      },
      relationship: '',
      tags: [],
      links: []
    });
    setOpenDialog(true);
  };

  const handleEdit = (coTraveler) => {
    setEditingCoTraveler(coTraveler);
    setFormData({
      name: coTraveler.name || '',
      type: coTraveler.type || '',
      industry: coTraveler.industry || '',
      status: coTraveler.status || 'Active',
      description: coTraveler.description || '',
      contactInfo: coTraveler.contactInfo || { email: '', phone: '', website: '' },
      relationship: coTraveler.relationship || '',
      tags: coTraveler.tags || [],
      links: coTraveler.links || []
    });
    setOpenDialog(true);
  };

  const handleDelete = async (coTravelerId) => {
    if (window.confirm('Are you sure you want to delete this co-traveler?')) {
      try {
        await normalizedDataService.deleteEntity(coTravelerId);
        setCoTravelers(coTravelers.filter(ct => ct.id !== coTravelerId));
      } catch (err) {
        console.error('Error deleting co-traveler:', err);
        setError('Failed to delete co-traveler');
      }
    }
  };

  const handleSave = async () => {
    try {
      const coTravelerData = {
        ...formData,
        lastUpdated: new Date().toISOString(),
        createdBy: 'Current User',
        entityType: 'co_traveler'
      };

      if (editingCoTraveler) {
        await normalizedDataService.saveEntity('co_traveler', {
          ...editingCoTraveler,
          ...coTravelerData
        });
        setCoTravelers(coTravelers.map(ct => ct.id === editingCoTraveler.id ? { ...ct, ...coTravelerData } : ct));
      } else {
        const newCoTraveler = await normalizedDataService.saveEntity('co_traveler', coTravelerData);
        setCoTravelers([...coTravelers, newCoTraveler]);
      }
      setOpenDialog(false);
    } catch (err) {
      console.error('Error saving co-traveler:', err);
      setError('Failed to save co-traveler');
    }
  };

  const renderCardContent = (coTraveler) => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            {coTraveler.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {coTraveler.type} • {coTraveler.industry}
          </Typography>
          <Box display="flex" gap={1} mb={1}>
            <Chip 
              label={coTraveler.status} 
              color={coTraveler.status === 'Active' ? 'success' : coTraveler.status === 'Inactive' ? 'error' : 'default'}
              size="small"
            />
            <Chip 
              label={coTraveler.relationship} 
              variant="outlined"
              size="small"
            />
          </Box>
        </Box>
      </Box>

      <Typography variant="body2" paragraph>
        {coTraveler.description}
      </Typography>

      <Box mb={2}>
        {coTraveler.tags.map((tag, index) => (
          <Chip
            key={index}
            label={tag}
            size="small"
            variant="outlined"
            sx={{ mr: 0.5, mb: 0.5 }}
          />
        ))}
      </Box>

      <Divider sx={{ my: 1 }} />

      <Typography variant="subtitle2" gutterBottom>
        Contact Information:
      </Typography>
      <Box mb={2}>
        {coTraveler.contactInfo.email && (
          <Box display="flex" alignItems="center" mb={0.5}>
            <EmailIcon fontSize="small" sx={{ mr: 1 }} />
            <Link href={`mailto:${coTraveler.contactInfo.email}`}>
              {coTraveler.contactInfo.email}
            </Link>
          </Box>
        )}
        {coTraveler.contactInfo.phone && (
          <Box display="flex" alignItems="center" mb={0.5}>
            <PhoneIcon fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="body2">{coTraveler.contactInfo.phone}</Typography>
          </Box>
        )}
        {coTraveler.contactInfo.website && (
          <Box display="flex" alignItems="center" mb={0.5}>
            <LinkIcon fontSize="small" sx={{ mr: 1 }} />
            <Link href={coTraveler.contactInfo.website} target="_blank" rel="noopener">
              {coTraveler.contactInfo.website}
            </Link>
          </Box>
        )}
      </Box>

      <Typography variant="subtitle2" gutterBottom>
        Links & Resources:
      </Typography>
      <List dense>
        {coTraveler.links.map((link, index) => (
          <ListItem key={index} disablePadding>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center">
                  {link.type === 'url' ? <LinkIcon fontSize="small" /> : <AttachFileIcon fontSize="small" />}
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    {link.label}
                  </Typography>
                </Box>
              }
              secondary={
                link.type === 'url' ? (
                  <Link href={link.url} target="_blank" rel="noopener">
                    {link.url}
                  </Link>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    {link.storage.toUpperCase()}: {link.fileId}
                  </Typography>
                )
              }
            />
            <ListItemSecondaryAction>
              <IconButton size="small">
                {link.type === 'url' ? <VisibilityIcon /> : <DownloadIcon />}
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
        <Typography variant="caption" color="text.secondary">
          Updated: {coTraveler.lastUpdated}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<StarIcon />}
          onClick={() => {/* Handle template usage */}}
        >
          Use as Template
        </Button>
      </Box>
    </Box>
  );

  const renderListRow = (coTraveler, column) => {
    const value = coTraveler[column.field];
    if (column.field === 'name') {
      return (
        <Box>
          <Typography variant="subtitle2" fontWeight="medium">
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {coTraveler.description}
          </Typography>
        </Box>
      );
    } else if (column.field === 'status') {
      return (
        <Chip 
          label={value} 
          color={value === 'Active' ? 'success' : value === 'Inactive' ? 'error' : 'default'}
          size="small"
        />
      );
    } else if (column.field === 'type' || column.field === 'industry') {
      return <Chip label={value} size="small" variant="outlined" />;
    }
    return value || '-';
  };

  const getFilteredCoTravelers = () => {
    let filtered = coTravelers;
    
    if (activeTab === 1) { // Templates
      filtered = filtered.filter(ct => ct.isTemplate);
    } else if (activeTab === 2) { // By Type
      // This will be handled by the UniversalDataView component
    } else if (activeTab === 3) { // By Industry
      // This will be handled by the UniversalDataView component
    }
    
    return filtered;
  };

  const tabContent = [
    {
      label: 'All Co-Travelers',
      content: (
        <UniversalDataView
          title="Co-Travelers Repository"
          data={getFilteredCoTravelers()}
          columns={columns}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={loadCoTravelers}
          loading={loading}
          error={error}
          searchFields={['name', 'description', 'tags', 'contactInfo.email']}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
          renderCardContent={renderCardContent}
          renderListRow={renderListRow}
          emptyMessage="No co-travelers found"
          addButtonText="Add Co-Traveler"
          searchPlaceholder="Search co-travelers, companies, contacts..."
        />
      )
    },
    {
      label: 'Templates',
      content: (
        <UniversalDataView
          title="Co-Traveler Templates"
          data={getFilteredCoTravelers().filter(ct => ct.isTemplate)}
          columns={columns}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={loadCoTravelers}
          loading={loading}
          error={error}
          searchFields={['name', 'description', 'tags']}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
          renderCardContent={renderCardContent}
          renderListRow={renderListRow}
          emptyMessage="No templates found"
          addButtonText="Add Template"
          searchPlaceholder="Search templates..."
        />
      )
    },
    {
      label: 'By Type',
      content: (
        <Box>
          {types.map(type => (
            <Box key={type} mb={4}>
              <Typography variant="h6" gutterBottom>
                {type}s
              </Typography>
              <UniversalDataView
                title=""
                data={getFilteredCoTravelers().filter(ct => ct.type === type)}
                columns={columns}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRefresh={loadCoTravelers}
                loading={loading}
                error={error}
                searchFields={['name', 'description']}
                filterOptions={[]}
                sortOptions={sortOptions}
                renderCardContent={renderCardContent}
                renderListRow={renderListRow}
                emptyMessage={`No ${type.toLowerCase()}s found`}
                addButtonText="Add Co-Traveler"
                searchPlaceholder={`Search ${type.toLowerCase()}s...`}
                showViewToggle={true}
                showSortDirection={true}
                showRefresh={false}
              />
            </Box>
          ))}
        </Box>
      )
    },
    {
      label: 'By Industry',
      content: (
        <Box>
          {industries.map(industry => (
            <Box key={industry} mb={4}>
              <Typography variant="h6" gutterBottom>
                {industry}
              </Typography>
              <UniversalDataView
                title=""
                data={getFilteredCoTravelers().filter(ct => ct.industry === industry)}
                columns={columns}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRefresh={loadCoTravelers}
                loading={loading}
                error={error}
                searchFields={['name', 'description']}
                filterOptions={[]}
                sortOptions={sortOptions}
                renderCardContent={renderCardContent}
                renderListRow={renderListRow}
                emptyMessage={`No co-travelers in ${industry.toLowerCase()} industry`}
                addButtonText="Add Co-Traveler"
                searchPlaceholder={`Search ${industry.toLowerCase()} co-travelers...`}
                showViewToggle={true}
                showSortDirection={true}
                showRefresh={false}
              />
            </Box>
          ))}
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          {tabContent.map((tab, index) => (
            <Tab key={index} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      {/* Tab Content */}
      {tabContent[activeTab].content}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCoTraveler ? 'Edit Co-Traveler' : 'Add New Co-Traveler'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company/Organization Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    label="Type"
                  >
                    {types.map(type => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Industry</InputLabel>
                  <Select
                    value={formData.industry}
                    onChange={(e) => setFormData({...formData, industry: e.target.value})}
                    label="Industry"
                  >
                    {industries.map(industry => (
                      <MenuItem key={industry} value={industry}>{industry}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    label="Status"
                  >
                    {statusOptions.map(status => (
                      <MenuItem key={status} value={status}>{status}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={formData.contactInfo.email}
                  onChange={(e) => setFormData({
                    ...formData, 
                    contactInfo: {...formData.contactInfo, email: e.target.value}
                  })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={formData.contactInfo.phone}
                  onChange={(e) => setFormData({
                    ...formData, 
                    contactInfo: {...formData.contactInfo, phone: e.target.value}
                  })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Website"
                  value={formData.contactInfo.website}
                  onChange={(e) => setFormData({
                    ...formData, 
                    contactInfo: {...formData.contactInfo, website: e.target.value}
                  })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Relationship</InputLabel>
                  <Select
                    value={formData.relationship}
                    onChange={(e) => setFormData({...formData, relationship: e.target.value})}
                    label="Relationship"
                  >
                    {relationshipTypes.map(rel => (
                      <MenuItem key={rel} value={rel}>{rel}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingCoTraveler ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CoTravelersRepository;