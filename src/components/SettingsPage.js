import React, { useState, useEffect } from 'react';
import { 
  Card,
  CardContent,
  CardHeader,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Box,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Button
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import normalizedDataService from '../services/normalizedDataService';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // State for each lookup table
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [deploymentModels, setDeploymentModels] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [tags, setTags] = useState([]);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [dialogType, setDialogType] = useState('');
  const [formData, setFormData] = useState({ name: '', description: '' });

  const tabConfig = [
    { label: 'Categories', key: 'categories', data: categories, setter: setCategories },
    { label: 'Vendors', key: 'vendors', data: vendors, setter: setVendors },
    { label: 'Deployment Models', key: 'deploymentModels', data: deploymentModels, setter: setDeploymentModels },
    { label: 'Statuses', key: 'statuses', data: statuses, setter: setStatuses },
    { label: 'Tags', key: 'tags', data: tags, setter: setTags }
  ];

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [categoriesData, vendorsData, deploymentData, statusesData, tagsData] = await Promise.all([
        normalizedDataService.getLookupItems('eams-categories'),
        normalizedDataService.getLookupItems('eams-vendors'),
        normalizedDataService.getLookupItems('eams-deployment-models'),
        normalizedDataService.getLookupItems('eams-statuses'),
        normalizedDataService.getLookupItems('eams-tags')
      ]);
      
      setCategories(categoriesData || []);
      setVendors(vendorsData || []);
      setDeploymentModels(deploymentData || []);
      setStatuses(statusesData || []);
      setTags(tagsData || []);
    } catch (error) {
      console.error('Error loading lookup data:', error);
      showSnackbar('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', description: '' });
    setDialogType('add');
    setDialogOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ name: item.name, description: item.description || '' });
    setDialogType('edit');
    setDialogOpen(true);
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        const currentConfig = tabConfig[activeTab];
        await normalizedDataService.deleteLookupItem(`eams-${currentConfig.key}`, item.id);
        currentConfig.setter(prev => prev.filter(i => i.id !== item.id));
        showSnackbar('Item deleted successfully');
      } catch (error) {
        console.error('Error deleting item:', error);
        showSnackbar('Error deleting item', 'error');
      }
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showSnackbar('Name is required', 'error');
      return;
    }

    try {
      const currentConfig = tabConfig[activeTab];
      const tableName = `eams-${currentConfig.key}`;
      
      if (dialogType === 'add') {
        const newItem = await normalizedDataService.saveLookupItem(tableName, {
          name: formData.name.trim(),
          description: formData.description.trim()
        });
        currentConfig.setter(prev => [...prev, newItem]);
        showSnackbar('Item added successfully');
      } else {
        const updatedItem = await normalizedDataService.updateLookupItem(tableName, editingItem.id, {
          name: formData.name.trim(),
          description: formData.description.trim()
        });
        currentConfig.setter(prev => prev.map(item => 
          item.id === editingItem.id ? updatedItem : item
        ));
        showSnackbar('Item updated successfully');
      }
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving item:', error);
      showSnackbar('Error saving item', 'error');
    }
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({ name: '', description: '' });
  };

  const currentData = tabConfig[activeTab]?.data || [];

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card style={{ marginBottom: '20px' }}>
        <CardHeader 
          title="Settings"
          subheader="Manage lookup tables for categories, vendors, deployment models, and other reference data."
        />
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              {tabConfig.map((tab, index) => (
                <Tab key={tab.key} label={tab.label} />
              ))}
            </Tabs>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>{tabConfig[activeTab]?.label}</h3>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              disabled={loading}
            >
              Add {tabConfig[activeTab]?.label.slice(0, -1)}
            </Button>
          </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading...</p>
          </div>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" style={{ padding: '40px' }}>
                      No {tabConfig[activeTab]?.label.toLowerCase()} found. Click "Add" to create the first one.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <strong>{item.name}</strong>
                      </TableCell>
                      <TableCell>
                        {item.description || '-'}
                      </TableCell>
                      <TableCell>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(item)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(item)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'add' ? 'Add' : 'Edit'} {tabConfig[activeTab]?.label.slice(0, -1)}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            style={{ marginBottom: '16px' }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            startIcon={<SaveIcon />}
          >
            {dialogType === 'add' ? 'Add' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default SettingsPage;
