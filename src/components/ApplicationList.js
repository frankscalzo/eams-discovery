import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Search as SearchIcon,
  FileDownload as ExportIcon,
  ContentCopy as CloneIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import { useProject } from '../contexts/ProjectContext';
import multiProjectAPI from '../services/multiProjectAPI';
import ExportTools from './ExportTools';
import CloneDialog from './CloneDialog';

const ApplicationList = () => {
  const { currentProject } = useProject();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);

  useEffect(() => {
    loadApplications();
  }, [currentProject]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await multiProjectAPI.applications.getApplications(currentProject.id);
      setApplications(data);
    } catch (err) {
      console.error('Error loading applications:', err);
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (event, application) => {
    setAnchorEl(event.currentTarget);
    setSelectedApplication(application);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedApplication(null);
  };

  const handleEdit = () => {
    navigate(`/projects/${currentProject.id}/applications/${selectedApplication.ApplicationID}`);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this application?')) {
      try {
        await multiProjectAPI.applications.deleteApplication(
          currentProject.id, 
          selectedApplication.ApplicationID
        );
        await loadApplications();
      } catch (err) {
        setError('Failed to delete application');
      }
    }
    handleMenuClose();
  };

  const handleClone = () => {
    setCloneDialogOpen(true);
    handleMenuClose();
  };

  const handleCloneConfirm = async (cloneData) => {
    try {
      // Create cloned application
      const clonedApp = {
        ...selectedApplication,
        ApplicationName: cloneData.name,
        ApplicationID: undefined, // Let it generate new ID
        projectId: cloneData.projectId
      };
      
      await multiProjectAPI.applications.createApplication(cloneData.projectId, clonedApp);
      setCloneDialogOpen(false);
      await loadApplications();
    } catch (err) {
      setError('Failed to clone application');
    }
  };

  const filteredApplications = applications.filter(app =>
    app.ApplicationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.ApplicationDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.Owner?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Applications
        </Typography>
        <Box display="flex" gap={2}>
          <ExportTools 
            data={filteredApplications} 
            filename={`${currentProject.name}-applications`}
            onExport={(format) => console.log(`Exported as ${format}`)}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate(`/projects/${currentProject.id}/applications/new`)}
          >
            Add Application
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            placeholder="Search applications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => navigate(`/projects/${currentProject.id}/applications?upload=true`)}
            >
              Bulk Upload
            </Button>
          </Box>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Application Name</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Criticality</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredApplications.map((app) => (
              <TableRow key={app.ApplicationID}>
                <TableCell>
                  <Typography variant="subtitle2">
                    {app.ApplicationName || 'Unnamed'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {app.ApplicationDescription || 'No description'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {app.Owner?.fullName || 'Not assigned'}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={app.TestingStatus || 'Unknown'} 
                    color={
                      app.TestingStatus === 'Completed' ? 'success' :
                      app.TestingStatus === 'In Progress' ? 'primary' :
                      app.TestingStatus === 'Failed' ? 'error' : 'default'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={app.LeanIXData?.criticality || 'Not set'} 
                    color={
                      app.LeanIXData?.criticality === 'Critical' ? 'error' :
                      app.LeanIXData?.criticality === 'High' ? 'warning' :
                      app.LeanIXData?.criticality === 'Medium' ? 'info' : 'default'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {app.Confidence ? `${app.Confidence}%` : 'N/A'}
                </TableCell>
                <TableCell>
                  <Tooltip title="More actions">
                    <IconButton
                      onClick={(e) => handleMenuClick(e, app)}
                      size="small"
                    >
                      <MoreIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredApplications.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm ? 'No applications found matching your search' : 'No applications found'}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {searchTerm ? 'Try adjusting your search terms' : 'Create your first application to get started'}
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(`/projects/${currentProject.id}/applications/new`)}
            >
              Add Application
            </Button>
          )}
        </Box>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleClone}>
          <ListItemIcon><CloneIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Clone</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Clone Dialog */}
      <CloneDialog
        open={cloneDialogOpen}
        onClose={() => setCloneDialogOpen(false)}
        onClone={handleCloneConfirm}
        originalItem={selectedApplication}
        itemType="Application"
        projects={[currentProject]} // In real app, you'd have multiple projects
      />
    </Box>
  );
};

export default ApplicationList;