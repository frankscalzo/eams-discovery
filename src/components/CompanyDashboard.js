import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Paper,
  Divider,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Business,
  Person,
  Settings,
  AttachFile,
  Timeline,
  Storage,
  CloudUpload,
  Notifications,
  Description,
  Group,
  LocationOn,
  Code,
  Notes
} from '@mui/icons-material';
import companyAPI from '../services/companyAPI';
import CompanyForm from './CompanyForm';

const CompanyDashboard = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [companyStats, setCompanyStats] = useState({});

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const companiesList = await companyAPI.getCompanies();
      setCompanies(companiesList);
    } catch (error) {
      console.error('Error loading companies:', error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: 'Failed to load companies',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyStats = async (companyId) => {
    try {
      const stats = await companyAPI.getCompanyStats(companyId);
      setCompanyStats(prev => ({
        ...prev,
        [companyId]: stats
      }));
    } catch (error) {
      console.error('Error loading company stats:', error);
    }
  };

  const handleCreateCompany = () => {
    setSelectedCompany(null);
    setFormDialogOpen(true);
  };

  const handleEditCompany = (company) => {
    setSelectedCompany(company);
    setFormDialogOpen(true);
  };

  const handleDeleteCompany = (company) => {
    setCompanyToDelete(company);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCompany = async () => {
    try {
      const result = await companyAPI.archiveCompany(companyToDelete.CompanyID);
      if (result.success) {
        await loadCompanies();
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'success',
          message: `Company "${companyToDelete.CompanyName}" archived successfully`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error deleting company:', error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `Failed to delete company: ${error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
    }
  };

  const handleCompanySave = (company) => {
    setFormDialogOpen(false);
    setSelectedCompany(null);
    loadCompanies();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderCompanyCard = (company) => (
    <Card key={company.CompanyID} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
              <Business />
            </Avatar>
            <Box>
              <Typography variant="h6" gutterBottom>
                {company.CompanyName}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Chip
                  label={company.Status}
                  size="small"
                  color={getStatusColor(company.Status)}
                />
                <Chip
                  icon={<LocationOn />}
                  label={company.ProjectLocation}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Box>
          </Box>
          <Box>
            <IconButton
              onClick={() => handleEditCompany(company)}
              size="small"
              sx={{ mr: 1 }}
            >
              <Edit />
            </IconButton>
            <IconButton
              onClick={() => handleDeleteCompany(company)}
              size="small"
              color="error"
            >
              <Delete />
            </IconButton>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Project Manager
            </Typography>
            <Typography variant="body2" gutterBottom>
              {company.ProjectManager?.name || 'Not specified'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {company.ProjectManager?.email || ''}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Executive Sponsor
            </Typography>
            <Typography variant="body2" gutterBottom>
              {company.ExecutiveSponsor?.name || 'Not specified'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {company.ExecutiveSponsor?.email || ''}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {company.Projects?.length || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Projects
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="secondary">
                {company.CompanyFiles?.length || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Files
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {company.IntegrationSettings?.teams?.enabled ? '✓' : '✗'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Teams
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {company.IntegrationSettings?.confluence?.enabled ? '✓' : '✗'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Confluence
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderCompanyDetails = (company) => {
    if (!company) return null;

    return (
      <Box>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Overview" />
          <Tab label="Projects" />
          <Tab label="Files" />
          <Tab label="Settings" />
        </Tabs>

        {activeTab === 0 && (
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Company Information
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Name:</strong> {company.CompanyName}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>State:</strong> {company.State}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Location:</strong> {company.ProjectLocation}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Status:</strong> {company.Status}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Contact Information
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>PM:</strong> {company.ProjectManager?.name} ({company.ProjectManager?.email})
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Executive:</strong> {company.ExecutiveSponsor?.name} ({company.ExecutiveSponsor?.email})
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Projects ({company.Projects?.length || 0})
            </Typography>
            {company.Projects?.length === 0 ? (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No projects associated with this company
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Project Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {company.Projects?.map((projectId, index) => (
                      <TableRow key={index}>
                        <TableCell>Project {projectId}</TableCell>
                        <TableCell>
                          <Chip label="Active" size="small" color="success" />
                        </TableCell>
                        <TableCell>{company.ProjectLocation}</TableCell>
                        <TableCell>{new Date(company.CreatedAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {activeTab === 2 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Company Files ({company.CompanyFiles?.length || 0})
            </Typography>
            {company.CompanyFiles?.length === 0 ? (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <AttachFile sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                  No files uploaded
                </Typography>
              </Paper>
            ) : (
              <List>
                {company.CompanyFiles?.map((file, index) => (
                  <ListItem key={file.FileID}>
                    <ListItemText
                      primary={file.FileName}
                      secondary={`${file.FileType} • ${formatFileSize(file.FileSize)} • ${new Date(file.UploadedAt).toLocaleDateString()}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end">
                        <CloudUpload />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}

        {activeTab === 3 && (
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Integration Settings
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        <strong>Teams:</strong> {company.IntegrationSettings?.teams?.enabled ? 'Enabled' : 'Disabled'}
                      </Typography>
                      {company.IntegrationSettings?.teams?.enabled && (
                        <Typography variant="caption" color="text.secondary">
                          Channel: {company.IntegrationSettings.teams.channelName}
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        <strong>Confluence:</strong> {company.IntegrationSettings?.confluence?.enabled ? 'Enabled' : 'Disabled'}
                      </Typography>
                      {company.IntegrationSettings?.confluence?.enabled && (
                        <Typography variant="caption" color="text.secondary">
                          Space: {company.IntegrationSettings.confluence.spaceKey}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Project Codes
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>ServiceNow:</strong> {company.ServiceNowProjectCode || 'Not set'}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Sage:</strong> {company.SageProjectCode || 'Not set'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading companies...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
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

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Company Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateCompany}
        >
          Create Company
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            Companies ({companies.length})
          </Typography>
          {companies.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Business sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No companies created yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create your first company to get started
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
              {companies.map(company => renderCompanyCard(company))}
            </Box>
          )}
        </Grid>
        <Grid item xs={12} md={8}>
          {selectedCompany ? (
            renderCompanyDetails(selectedCompany)
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Select a company to view details
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Company Form Dialog */}
      <Dialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent sx={{ p: 0 }}>
          <CompanyForm
            company={selectedCompany}
            mode={selectedCompany ? 'edit' : 'create'}
            onSave={handleCompanySave}
            onCancel={() => setFormDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to archive "{companyToDelete?.CompanyName}"? 
            This action can be undone later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteCompany}
            color="error"
            variant="contained"
          >
            Archive
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompanyDashboard;
