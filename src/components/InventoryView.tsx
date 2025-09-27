import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  Avatar,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountTree as DependenciesIcon,
  Assessment as ReportIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { FactSheet, FactSheetType, LifecycleStatus, CriticalityLevel, InventoryFilter, InventorySort } from '../types/eams';
import { useProject } from '../contexts/ProjectContext';
import ExcelDataGrid from './ExcelDataGrid';
import ExcelDataImporter from './ExcelDataImporter';

interface InventoryViewProps {
  factSheetType?: FactSheetType;
  onFactSheetSelect?: (factSheet: FactSheet) => void;
  onEdit?: (factSheet: FactSheet) => void;
  onDelete?: (factSheet: FactSheet) => void;
  showFilters?: boolean;
  showActions?: boolean;
  compact?: boolean;
}

const InventoryView: React.FC<InventoryViewProps> = ({
  factSheetType,
  onFactSheetSelect,
  onEdit,
  onDelete,
  showFilters = true,
  showActions = true,
  compact = false
}) => {
  const { currentProject } = useProject();
  const [factSheets, setFactSheets] = useState<FactSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter and sort state
  const [filters, setFilters] = useState<InventoryFilter>({
    factSheetTypes: factSheetType ? [factSheetType] : undefined,
    projectId: currentProject?.ProjectID
  });
  const [sort, setSort] = useState<InventorySort>({ field: 'name', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI state
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedFactSheet, setSelectedFactSheet] = useState<FactSheet | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showExcelImporter, setShowExcelImporter] = useState(false);

  // Mock data for now - replace with API calls
  useEffect(() => {
    const loadFactSheets = async () => {
      setLoading(true);
      try {
        // Mock data - replace with actual API call
        const mockData: FactSheet[] = [
          {
            id: '1',
            type: 'APPLICATION',
            name: 'Customer Management System',
            description: 'Core CRM application for managing customer relationships',
            status: 'ACTIVE',
            tags: ['CRM', 'Customer', 'Sales'],
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-09-20'),
            projectId: currentProject?.ProjectID || '',
            owner: 'John Smith',
            cost: 50000,
            criticality: 'HIGH',
            data: {
              applicationName: 'Customer Management System',
              applicationDescription: 'Core CRM application for managing customer relationships',
              teams: ['Sales', 'Marketing'],
              owner: { fullName: 'John Smith', email: 'john.smith@company.com' },
              manager: { fullName: 'Jane Doe', email: 'jane.doe@company.com' },
              epicTicket: 'EPIC-123',
              testPlanReady: true,
              testingStatus: 'COMPLETED',
              confidence: 85,
              integrationType: 'API',
              integrationDetails: [],
              discoveryQuestions: [],
              eamsData: {
                criticality: 'HIGH',
                containsPHI: false,
                longTermGoal: 'INVEST'
              },
              technicalSpecs: {
                platform: 'AWS',
                technology: ['React', 'Node.js', 'PostgreSQL'],
                hosting: 'CLOUD'
              },
              businessValue: {
                businessCapability: 'Customer Management',
                users: 150,
                revenue: 1000000
              }
            }
          },
          {
            id: '2',
            type: 'APPLICATION',
            name: 'Legacy Billing System',
            description: 'Legacy system for billing and invoicing',
            status: 'PHASE_OUT',
            tags: ['Billing', 'Legacy', 'Finance'],
            createdAt: new Date('2020-03-10'),
            updatedAt: new Date('2024-08-15'),
            projectId: currentProject?.ProjectID || '',
            owner: 'Mike Johnson',
            cost: 25000,
            criticality: 'MEDIUM',
            data: {
              applicationName: 'Legacy Billing System',
              applicationDescription: 'Legacy system for billing and invoicing',
              teams: ['Finance', 'IT'],
              owner: { fullName: 'Mike Johnson', email: 'mike.johnson@company.com' },
              manager: { fullName: 'Sarah Wilson', email: 'sarah.wilson@company.com' },
              testPlanReady: false,
              testingStatus: 'NOT_STARTED',
              confidence: 60,
              integrationType: 'DATABASE',
              integrationDetails: [],
              discoveryQuestions: [],
              eamsData: {
                criticality: 'MEDIUM',
                containsPHI: true,
                longTermGoal: 'DEPRECATE'
              },
              technicalSpecs: {
                platform: 'On-Premise',
                technology: ['Java', 'Oracle'],
                hosting: 'ON_PREMISE'
              },
              businessValue: {
                businessCapability: 'Financial Management',
                users: 50,
                revenue: 500000
              }
            }
          }
        ];
        
        setFactSheets(mockData);
      } catch (err) {
        setError('Failed to load fact sheets');
        console.error('Error loading fact sheets:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFactSheets();
  }, [currentProject, filters]);

  // Filter and sort fact sheets
  const filteredAndSortedFactSheets = useMemo(() => {
    let filtered = factSheets;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(fs => 
        fs.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fs.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fs.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply other filters
    if (filters.factSheetTypes?.length) {
      filtered = filtered.filter(fs => filters.factSheetTypes!.includes(fs.type));
    }
    if (filters.status?.length) {
      filtered = filtered.filter(fs => filters.status!.includes(fs.status));
    }
    if (filters.criticality?.length) {
      filtered = filtered.filter(fs => filters.criticality!.includes(fs.criticality));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sort.field as keyof FactSheet];
      const bValue = b[sort.field as keyof FactSheet];
      
      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [factSheets, searchTerm, filters, sort]);

  const getStatusColor = (status: LifecycleStatus) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'PLANNED': return 'info';
      case 'PHASE_OUT': return 'warning';
      case 'SUNSET': return 'error';
      default: return 'default';
    }
  };

  const getCriticalityColor = (criticality: CriticalityLevel) => {
    switch (criticality) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const handleRowClick = (factSheet: FactSheet) => {
    if (onFactSheetSelect) {
      onFactSheetSelect(factSheet);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, factSheet: FactSheet) => {
    setAnchorEl(event.currentTarget);
    setSelectedFactSheet(factSheet);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedFactSheet(null);
  };

  const handleEdit = () => {
    if (selectedFactSheet && onEdit) {
      onEdit(selectedFactSheet);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedFactSheet && onDelete) {
      onDelete(selectedFactSheet);
    }
    handleMenuClose();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(filteredAndSortedFactSheets.map(fs => fs.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (factSheetId: string, checked: boolean) => {
    if (checked) {
      setSelectedRows(prev => [...prev, factSheetId]);
    } else {
      setSelectedRows(prev => prev.filter(id => id !== factSheetId));
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading inventory...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">{error}</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Inventory View
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredAndSortedFactSheets.length} fact sheets found
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => {/* Add new fact sheet */}}
          >
            Add Fact Sheet
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            variant="outlined"
            onClick={() => {/* Export data */}}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      {showFilters && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <FilterIcon />
              <Typography variant="h6">Filters</Typography>
              <Button
                size="small"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                {showAdvancedFilters ? 'Hide' : 'Show'} Advanced
              </Button>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search fact sheets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={filters.factSheetTypes?.[0] || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      factSheetTypes: e.target.value ? [e.target.value as FactSheetType] : undefined
                    }))}
                    label="Type"
                  >
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="APPLICATION">Application</MenuItem>
                    <MenuItem value="BUSINESS_CAPABILITY">Business Capability</MenuItem>
                    <MenuItem value="IT_COMPONENT">IT Component</MenuItem>
                    <MenuItem value="PROJECT">Project</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status?.[0] || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      status: e.target.value ? [e.target.value as LifecycleStatus] : undefined
                    }))}
                    label="Status"
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="PLANNED">Planned</MenuItem>
                    <MenuItem value="PHASE_OUT">Phase Out</MenuItem>
                    <MenuItem value="SUNSET">Sunset</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Criticality</InputLabel>
                  <Select
                    value={filters.criticality?.[0] || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      criticality: e.target.value ? [e.target.value as CriticalityLevel] : undefined
                    }))}
                    label="Criticality"
                  >
                    <MenuItem value="">All Criticality</MenuItem>
                    <MenuItem value="CRITICAL">Critical</MenuItem>
                    <MenuItem value="HIGH">High</MenuItem>
                    <MenuItem value="MEDIUM">Medium</MenuItem>
                    <MenuItem value="LOW">Low</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {showAdvancedFilters && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Advanced Filters</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={<Checkbox />}
                        label="Contains PHI"
                      />
                      <FormControlLabel
                        control={<Checkbox />}
                        label="Test Plan Ready"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={<Checkbox />}
                        label="Cloud Hosted"
                      />
                      <FormControlLabel
                        control={<Checkbox />}
                        label="Legacy Systems"
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            )}
          </CardContent>
        </Card>
      )}

      {/* Excel-like Data Grid */}
      <ExcelDataGrid
        data={filteredAndSortedFactSheets}
        columns={[
          {
            id: 'name',
            label: 'Name',
            minWidth: 200,
            sortable: true,
            filterable: true,
            type: 'string'
          },
          {
            id: 'type',
            label: 'Type',
            minWidth: 120,
            sortable: true,
            filterable: true,
            type: 'chip',
            colorMap: {
              'APPLICATION': 'primary',
              'BUSINESS_CAPABILITY': 'secondary',
              'IT_COMPONENT': 'success',
              'PROJECT': 'warning'
            }
          },
          {
            id: 'status',
            label: 'Status',
            minWidth: 120,
            sortable: true,
            filterable: true,
            type: 'chip',
            colorMap: {
              'ACTIVE': 'success',
              'PLANNED': 'info',
              'PHASE_OUT': 'warning',
              'SUNSET': 'error'
            }
          },
          {
            id: 'criticality',
            label: 'Criticality',
            minWidth: 120,
            sortable: true,
            filterable: true,
            type: 'chip',
            colorMap: {
              'CRITICAL': 'error',
              'HIGH': 'warning',
              'MEDIUM': 'info',
              'LOW': 'success'
            }
          },
          {
            id: 'owner',
            label: 'Owner',
            minWidth: 150,
            sortable: true,
            filterable: true,
            type: 'string'
          },
          {
            id: 'cost',
            label: 'Cost',
            minWidth: 100,
            sortable: true,
            filterable: true,
            type: 'number',
            format: (value) => value ? `$${value.toLocaleString()}` : '-'
          },
          {
            id: 'tags',
            label: 'Tags',
            minWidth: 150,
            filterable: true,
            type: 'string',
            format: (value) => Array.isArray(value) ? value.join(', ') : value
          },
          {
            id: 'updatedAt',
            label: 'Last Updated',
            minWidth: 120,
            sortable: true,
            filterable: true,
            type: 'date',
            format: (value) => new Date(value).toLocaleDateString()
          }
        ]}
        onDataChange={(newData) => {
          // Handle data changes
          console.log('Data changed:', newData);
        }}
        onRowAdd={(row) => {
          // Handle row addition - open Excel importer
          setShowExcelImporter(true);
        }}
        onRowEdit={(row, index) => {
          // Handle row editing
          console.log('Edit row:', row, index);
        }}
        onRowDelete={(index) => {
          // Handle row deletion
          console.log('Delete row:', index);
        }}
        onColumnReorder={(newColumns) => {
          // Handle column reordering
          console.log('Columns reordered:', newColumns);
        }}
        onColumnVisibilityChange={(columnId, visible) => {
          // Handle column visibility changes
          console.log('Column visibility changed:', columnId, visible);
        }}
        onSelectionChange={(selectedRows) => {
          // Handle selection changes
          console.log('Selection changed:', selectedRows);
        }}
        title="Asset Inventory"
        showToolbar={true}
        showPagination={true}
        showColumnControls={true}
        showFilters={true}
        showSearch={true}
        editable={true}
        selectable={true}
        height={600}
      />

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {/* View details */}}>
          <ListItemIcon>
            <ViewIcon />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {/* View dependencies */}}>
          <ListItemIcon>
            <DependenciesIcon />
          </ListItemIcon>
          <ListItemText>View Dependencies</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Excel Data Importer */}
      <ExcelDataImporter
        open={showExcelImporter}
        onClose={() => setShowExcelImporter(false)}
        onDataImport={(data) => {
          console.log('Imported data:', data);
          // Handle imported data - add to factSheets state
          setFactSheets(prev => [...prev, ...data]);
          setShowExcelImporter(false);
        }}
        targetSchema={{
          id: '',
          type: 'APPLICATION',
          name: '',
          description: '',
          status: 'ACTIVE',
          criticality: 'MEDIUM',
          owner: '',
          cost: 0,
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }}
      />
    </Box>
  );
};

export default InventoryView;
