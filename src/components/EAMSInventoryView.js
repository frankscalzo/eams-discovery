import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Checkbox,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Badge,
  Avatar,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  MoreVert as MoreVertIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Timeline as TimelineIcon,
  Business as BusinessIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useProject } from '../contexts/ProjectContext';
import mockAPI from '../services/mockAPI';
import ComprehensiveApplicationForm from './ComprehensiveApplicationForm';

const LeanIXInventoryView = () => {
  const { currentProject } = useProject();
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCriticality, setFilterCriticality] = useState('ALL');
  const [sortField, setSortField] = useState('applicationName');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const statusOptions = [
    'ALL',
    'ACTIVE',
    'INACTIVE',
    'PHASE_OUT',
    'PLANNED',
    'DEPRECATED'
  ];

  const criticalityOptions = [
    'ALL',
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
  ];

  const columns = [
    { id: 'applicationName', label: 'Application Name', sortable: true, width: 200 },
    { id: 'teams', label: 'Teams', sortable: false, width: 150 },
    { id: 'owner', label: 'Owner', sortable: true, width: 150 },
    { id: 'manager', label: 'Manager', sortable: true, width: 150 },
    { id: 'epicTicket', label: 'Epic/SLG/CHG', sortable: false, width: 120 },
    { id: 'testPlanReady', label: 'Test Plan Ready', sortable: true, width: 120 },
    { id: 'testingStatus', label: 'Testing Status', sortable: true, width: 120 },
    { id: 'confidence', label: 'Confidence %', sortable: true, width: 120 },
    { id: 'integrationType', label: 'Integration Type', sortable: true, width: 150 },
    { id: 'roi', label: 'ROI', sortable: true, width: 100 },
    { id: 'rto', label: 'RTO', sortable: true, width: 100 },
    { id: 'rpo', label: 'RPO', sortable: true, width: 100 },
    { id: 'criticality', label: 'Criticality', sortable: true, width: 120 },
    { id: 'status', label: 'Status', sortable: true, width: 100 },
    { id: 'actions', label: 'Actions', sortable: false, width: 100 }
  ];

  useEffect(() => {
    loadApplications();
  }, [currentProject]);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, filterStatus, filterCriticality]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await mockAPI.applications.getApplications(currentProject.id);
      setApplications(data);
    } catch (error) {
      console.error('Error loading applications:', error);
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = applications.filter(app => {
      const matchesSearch = app.applicationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           app.applicationDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           app.owner?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           app.teams?.some(team => team.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = filterStatus === 'ALL' || app.status === filterStatus;
      const matchesCriticality = filterCriticality === 'ALL' || app.leanixData?.criticality === filterCriticality;
      
      return matchesSearch && matchesStatus && matchesCriticality;
    });

    // Sort applications
    filtered.sort((a, b) => {
      const aValue = getNestedValue(a, sortField);
      const bValue = getNestedValue(b, sortField);
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredApplications(filtered);
  };

  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((o, p) => o && o[p], obj) || '';
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const newSelected = filteredApplications
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        .map(app => app.id);
      setSelectedApplications(newSelected);
    } else {
      setSelectedApplications([]);
    }
  };

  const handleSelectApplication = (applicationId) => {
    setSelectedApplications(prev => {
      if (prev.includes(applicationId)) {
        return prev.filter(id => id !== applicationId);
      } else {
        return [...prev, applicationId];
      }
    });
  };

  const handleMenuClick = (event, application) => {
    setAnchorEl(event.currentTarget);
    setSelectedApplication(application);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedApplication(null);
  };

  const handleEdit = (application) => {
    setEditingApplication(application);
    setShowForm(true);
    handleMenuClose();
  };

  const handleDelete = async (application) => {
    if (window.confirm(`Are you sure you want to delete "${application.applicationName}"?`)) {
      try {
        await mockAPI.applications.deleteApplication(application.id);
        await loadApplications();
      } catch (error) {
        console.error('Error deleting application:', error);
        setError('Failed to delete application');
      }
    }
    handleMenuClose();
  };

  const handleFormSave = async (applicationData) => {
    try {
      if (editingApplication) {
        await mockAPI.applications.updateApplication(editingApplication.id, applicationData);
      } else {
        await mockAPI.applications.createApplication(applicationData);
      }
      await loadApplications();
      setShowForm(false);
      setEditingApplication(null);
    } catch (error) {
      console.error('Error saving application:', error);
      setError('Failed to save application');
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingApplication(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'default';
      case 'PHASE_OUT': return 'warning';
      case 'PLANNED': return 'info';
      case 'DEPRECATED': return 'error';
      default: return 'default';
    }
  };

  const getCriticalityColor = (criticality) => {
    switch (criticality) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
      case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  const getTestingStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircleIcon color="success" />;
      case 'IN_PROGRESS': return <TimelineIcon color="info" />;
      case 'FAILED': return <ErrorIcon color="error" />;
      case 'ON_HOLD': return <WarningIcon color="warning" />;
      default: return <InfoIcon color="default" />;
    }
  };

  const renderTableHeader = () => (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
            indeterminate={selectedApplications.length > 0 && selectedApplications.length < filteredApplications.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length}
            checked={filteredApplications.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length > 0 && selectedApplications.length === filteredApplications.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length}
            onChange={handleSelectAll}
          />
        </TableCell>
        {columns.map((column) => (
          <TableCell
            key={column.id}
            style={{ width: column.width }}
            sortDirection={sortField === column.id ? sortDirection : false}
          >
            {column.sortable ? (
              <TableSortLabel
                active={sortField === column.id}
                direction={sortField === column.id ? sortDirection : 'asc'}
                onClick={() => handleSort(column.id)}
              >
                {column.label}
              </TableSortLabel>
            ) : (
              column.label
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );

  const renderTableRow = (application) => (
    <TableRow
      key={application.id}
      hover
      selected={selectedApplications.includes(application.id)}
      onClick={() => handleSelectApplication(application.id)}
    >
      <TableCell padding="checkbox">
        <Checkbox
          checked={selectedApplications.includes(application.id)}
          onChange={() => handleSelectApplication(application.id)}
        />
      </TableCell>
      <TableCell>
        <Box display="flex" alignItems="center" gap={1}>
          <BusinessIcon color="primary" />
          <Typography variant="body2" fontWeight="medium">
            {application.applicationName}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Box display="flex" gap={0.5} flexWrap="wrap">
          {application.teams?.slice(0, 2).map((team, index) => (
            <Chip key={index} label={team} size="small" variant="outlined" />
          ))}
          {application.teams?.length > 2 && (
            <Chip label={`+${application.teams.length - 2}`} size="small" variant="outlined" />
          )}
        </Box>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {application.owner?.fullName || '-'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {application.manager?.fullName || '-'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {application.epicTicket || '-'}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={application.testPlanReady ? 'Yes' : 'No'}
          color={application.testPlanReady ? 'success' : 'default'}
          size="small"
        />
      </TableCell>
      <TableCell>
        <Box display="flex" alignItems="center" gap={0.5}>
          {getTestingStatusIcon(application.testingStatus)}
          <Typography variant="body2">
            {application.testingStatus?.replace('_', ' ') || '-'}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Box display="flex" alignItems="center" gap={1}>
          <LinearProgress
            variant="determinate"
            value={application.confidence || 0}
            sx={{ width: 60, height: 8 }}
          />
          <Typography variant="body2">
            {application.confidence || 0}%
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          label={application.integrationType?.replace('_', ' ') || '-'}
          size="small"
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {application.roi ? `$${application.roi.toLocaleString()}` : '-'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {application.rto ? `${application.rto}h` : '-'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {application.rpo ? `${application.rpo}h` : '-'}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={application.leanixData?.criticality || '-'}
          color={getCriticalityColor(application.leanixData?.criticality)}
          size="small"
        />
      </TableCell>
      <TableCell>
        <Chip
          label={application.status || '-'}
          color={getStatusColor(application.status)}
          size="small"
        />
      </TableCell>
      <TableCell>
        <IconButton
          size="small"
          onClick={(e) => handleMenuClick(e, application)}
        >
          <MoreVertIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );

  const renderGridView = () => (
    <Grid container spacing={2}>
      {filteredApplications
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        .map((application) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={application.id}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                border: selectedApplications.includes(application.id) ? 2 : 1,
                borderColor: selectedApplications.includes(application.id) ? 'primary.main' : 'divider'
              }}
              onClick={() => handleSelectApplication(application.id)}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <BusinessIcon color="primary" />
                    <Typography variant="h6" noWrap>
                      {application.applicationName}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMenuClick(e, application);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {application.applicationDescription?.substring(0, 100)}...
                </Typography>
                
                <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                  <Chip
                    label={application.status}
                    color={getStatusColor(application.status)}
                    size="small"
                  />
                  <Chip
                    label={application.leanixData?.criticality || 'Unknown'}
                    color={getCriticalityColor(application.leanixData?.criticality)}
                    size="small"
                  />
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {application.owner?.fullName || 'No owner'}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {getTestingStatusIcon(application.testingStatus)}
                    <Typography variant="body2">
                      {application.confidence || 0}%
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
    </Grid>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading applications...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Application Inventory
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowForm(true)}
          >
            Add Application
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
          >
            Import
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadApplications}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                {statusOptions.map(option => (
                  <MenuItem key={option} value={option}>
                    {option.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Criticality</InputLabel>
              <Select
                value={filterCriticality}
                onChange={(e) => setFilterCriticality(e.target.value)}
              >
                {criticalityOptions.map(option => (
                  <MenuItem key={option} value={option}>
                    {option.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Box display="flex" gap={1}>
              <IconButton
                color={viewMode === 'table' ? 'primary' : 'default'}
                onClick={() => setViewMode('table')}
              >
                <ViewListIcon />
              </IconButton>
              <IconButton
                color={viewMode === 'grid' ? 'primary' : 'default'}
                onClick={() => setViewMode('grid')}
              >
                <ViewModuleIcon />
              </IconButton>
            </Box>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary">
              {filteredApplications.length} applications
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Content */}
      {viewMode === 'table' ? (
        <TableContainer component={Paper}>
          <Table>
            {renderTableHeader()}
            <TableBody>
              {filteredApplications
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map(renderTableRow)}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filteredApplications.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </TableContainer>
      ) : (
        <>
          {renderGridView()}
          <Box display="flex" justifyContent="center" mt={3}>
            <TablePagination
              rowsPerPageOptions={[12, 24, 48, 96]}
              component="div"
              count={filteredApplications.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(event, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
            />
          </Box>
        </>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleEdit(selectedApplication)}>
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDelete(selectedApplication)}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Application Form Dialog */}
      <Dialog
        open={showForm}
        onClose={handleFormCancel}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {editingApplication ? 'Edit Application' : 'Add New Application'}
        </DialogTitle>
        <DialogContent>
          <ComprehensiveApplicationForm
            applicationId={editingApplication?.id}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LeanIXInventoryView;
