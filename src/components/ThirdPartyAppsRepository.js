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
  Divider,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  AttachFile as AttachFileIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Star as StarIcon
} from '@mui/icons-material';
import UniversalDataView from './UniversalDataView';
import normalizedDataService, { NormalizedDataService } from '../services/normalizedDataService';

const ThirdPartyAppsRepository = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    vendor: '',
    category: '',
    version: '',
    status: 'Active',
    description: '',
    tags: [],
    links: []
  });

  const categories = ['Productivity', 'CRM', 'Communication', 'Security', 'Development', 'Analytics', 'Other'];
  const statusOptions = ['Active', 'Inactive', 'Deprecated', 'Under Review'];

  const columns = [
    { field: 'name', label: 'Name' },
    { field: 'vendor', label: 'Vendor' },
    { field: 'category', label: 'Category' },
    { field: 'version', label: 'Version' },
    { field: 'status', label: 'Status' },
    { field: 'lastUpdated', label: 'Last Updated' }
  ];

  const filterOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories.map(cat => ({ value: cat, label: cat }))
  ];

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'vendor', label: 'Vendor' },
    { value: 'category', label: 'Category' },
    { value: 'lastUpdated', label: 'Last Updated' },
    { value: 'status', label: 'Status' }
  ];

  const advancedFilters = [
    {
      field: 'category',
      label: 'Category',
      type: 'multiselect',
      options: categories.map(cat => ({ value: cat, label: cat }))
    },
    {
      field: 'status',
      label: 'Status',
      type: 'multiselect',
      options: statusOptions.map(status => ({ value: status, label: status }))
    },
    {
      field: 'vendor',
      label: 'Vendor',
      type: 'text',
      placeholder: 'Filter by vendor...'
    },
    {
      field: 'version',
      label: 'Version',
      type: 'text',
      placeholder: 'Filter by version...'
    },
    {
      field: 'tags',
      label: 'Tags',
      type: 'multiselect',
      options: [
        { value: 'cloud', label: 'Cloud' },
        { value: 'enterprise', label: 'Enterprise' },
        { value: 'security', label: 'Security' },
        { value: 'productivity', label: 'Productivity' },
        { value: 'collaboration', label: 'Collaboration' }
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
    loadApps();
  }, []);

  const loadApps = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to load from normalized data service first
      const result = await normalizedDataService.getEntitiesByType(
        NormalizedDataService.ENTITY_TYPES.THIRD_PARTY_APP
      );
      if (result && result.length > 0) {
        setApps(result);
      } else {
        // Fallback to sample data if no data found
        console.log('No data found, using sample data');
        setApps(getSampleApps());
      }
    } catch (err) {
      console.error('Error loading apps:', err);
      setError('Failed to load applications. Using sample data.');
      setApps(getSampleApps());
    } finally {
      setLoading(false);
    }
  };

  const getSampleApps = () => [
    {
      id: '1',
      name: 'Microsoft Office 365',
      vendor: 'Microsoft',
      category: 'Productivity',
      version: '2023',
      status: 'Active',
      description: 'Cloud-based productivity suite including Word, Excel, PowerPoint, and Teams.',
      tags: ['productivity', 'office', 'cloud', 'collaboration'],
      links: [
        { type: 'url', label: 'Office 365 Admin Center', url: 'https://admin.microsoft.com' },
        { type: 'file', label: 'Security Guidelines', fileId: 'office365-security.pdf', storage: 's3' }
      ],
      lastUpdated: '2024-01-15',
      createdBy: 'System Admin'
    },
    {
      id: '2',
      name: 'Salesforce CRM',
      vendor: 'Salesforce',
      category: 'CRM',
      version: 'Winter 2024',
      status: 'Active',
      description: 'Customer relationship management platform for sales, service, and marketing.',
      tags: ['crm', 'sales', 'customer-management', 'cloud'],
      links: [
        { type: 'url', label: 'Salesforce Setup', url: 'https://setup.salesforce.com' },
        { type: 'file', label: 'Integration Guide', fileId: 'salesforce-integration.pdf', storage: 's3' }
      ],
      lastUpdated: '2024-01-12',
      createdBy: 'System Admin'
    },
    {
      id: '3',
      name: 'Slack',
      vendor: 'Slack Technologies',
      category: 'Communication',
      version: 'Latest',
      status: 'Active',
      description: 'Team communication and collaboration platform.',
      tags: ['communication', 'team', 'collaboration', 'messaging'],
      links: [
        { type: 'url', label: 'Slack Help Center', url: 'https://slack.com/help' },
        { type: 'file', label: 'Security Guidelines', fileId: 'slack-security.pdf', storage: 's3' }
      ],
      lastUpdated: '2024-01-10',
      createdBy: 'System Admin'
    }
  ];

  const handleAdd = () => {
    setEditingApp(null);
    setFormData({
      name: '',
      vendor: '',
      category: '',
      version: '',
      status: 'Active',
      description: '',
      tags: [],
      links: []
    });
    setOpenDialog(true);
  };

  const handleEdit = (app) => {
    setEditingApp(app);
    setFormData({
      name: app.name || '',
      vendor: app.vendor || '',
      category: app.category || '',
      version: app.version || '',
      status: app.status || 'Active',
      description: app.description || '',
      tags: app.tags || [],
      links: app.links || []
    });
    setOpenDialog(true);
  };

  const handleDelete = async (appId) => {
    if (window.confirm('Are you sure you want to delete this application?')) {
      try {
        await normalizedDataService.deleteEntity(appId);
        setApps(apps.filter(app => app.id !== appId));
      } catch (err) {
        console.error('Error deleting app:', err);
        setError('Failed to delete application');
      }
    }
  };

  const handleSave = async () => {
    try {
      const appData = {
        ...formData,
        lastUpdated: new Date().toISOString(),
        createdBy: 'Current User',
        entityType: 'third_party_app'
      };

      if (editingApp) {
        await normalizedDataService.saveEntity('third_party_app', {
          ...editingApp,
          ...appData
        });
        setApps(apps.map(app => app.id === editingApp.id ? { ...app, ...appData } : app));
      } else {
        const newApp = await normalizedDataService.saveEntity('third_party_app', appData);
        setApps([...apps, newApp]);
      }
      setOpenDialog(false);
    } catch (err) {
      console.error('Error saving app:', err);
      setError('Failed to save application');
    }
  };

  const renderCardContent = (app) => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            {app.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {app.vendor} • {app.version}
          </Typography>
          <Chip 
            label={app.status} 
            color={app.status === 'Active' ? 'success' : app.status === 'Inactive' ? 'error' : 'default'}
            size="small"
            sx={{ mb: 1 }}
          />
        </Box>
      </Box>

      <Typography variant="body2" paragraph>
        {app.description}
      </Typography>

      <Box mb={2}>
        {app.tags.map((tag, index) => (
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
        Links & Resources:
      </Typography>
      <List dense>
        {app.links.map((link, index) => (
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
          Updated: {app.lastUpdated}
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

  const renderListRow = (app, column) => {
    const value = app[column.field];
    if (column.field === 'name') {
      return (
        <Box>
          <Typography variant="subtitle2" fontWeight="medium">
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {app.description}
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
    } else if (column.field === 'category') {
      return <Chip label={value} size="small" variant="outlined" />;
    }
    return value || '-';
  };

  const getFilteredApps = () => {
    let filtered = apps;
    
    if (activeTab === 1) { // Templates
      filtered = filtered.filter(app => app.isTemplate);
    } else if (activeTab === 2) { // By Category
      // This will be handled by the UniversalDataView component
    }
    
    return filtered;
  };

  const tabContent = [
    {
      label: 'All Apps',
      content: (
        <UniversalDataView
          title="Third Party Applications"
          data={getFilteredApps()}
          columns={columns}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={loadApps}
          loading={loading}
          error={error}
          searchFields={['name', 'vendor', 'description', 'tags']}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
          advancedFilters={advancedFilters}
          renderCardContent={renderCardContent}
          renderListRow={renderListRow}
          emptyMessage="No applications found"
          addButtonText="Add Application"
          searchPlaceholder="Search applications, vendors, tags..."
          showAdvancedFilters={true}
        />
      )
    },
    {
      label: 'Templates',
      content: (
        <UniversalDataView
          title="Application Templates"
          data={getFilteredApps().filter(app => app.isTemplate)}
          columns={columns}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={loadApps}
          loading={loading}
          error={error}
          searchFields={['name', 'vendor', 'description', 'tags']}
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
      label: 'By Category',
      content: (
        <Box>
          {categories.map(category => (
            <Box key={category} mb={4}>
              <Typography variant="h6" gutterBottom>
                {category}
              </Typography>
              <UniversalDataView
                title=""
                data={getFilteredApps().filter(app => app.category === category)}
                columns={columns}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRefresh={loadApps}
                loading={loading}
                error={error}
                searchFields={['name', 'vendor', 'description']}
                filterOptions={[]}
                sortOptions={sortOptions}
                renderCardContent={renderCardContent}
                renderListRow={renderListRow}
                emptyMessage={`No applications in ${category} category`}
                addButtonText="Add Application"
                searchPlaceholder={`Search ${category.toLowerCase()} applications...`}
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
          {editingApp ? 'Edit Application' : 'Add New Application'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Application Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Vendor"
                  value={formData.vendor}
                  onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    label="Category"
                  >
                    {categories.map(category => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Version"
                  value={formData.version}
                  onChange={(e) => setFormData({...formData, version: e.target.value})}
                />
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
            {editingApp ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ThirdPartyAppsRepository;