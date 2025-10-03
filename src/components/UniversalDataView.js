import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Paper,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert
} from '@mui/material';
import AdvancedFilters from './AdvancedFilters';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  GridView as GridIcon,
  ViewList as ListIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Star as StarIcon,
  Link as LinkIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';

const UniversalDataView = ({
  title,
  data = [],
  columns = [],
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
  loading = false,
  error = null,
  searchFields = [],
  filterOptions = [],
  sortOptions = [],
  advancedFilters = [],
  renderCardContent,
  renderListRow,
  emptyMessage = "No data available",
  addButtonText = "Add New",
  searchPlaceholder = "Search...",
  showViewToggle = true,
  showSortDirection = true,
  showRefresh = true,
  showAdvancedFilters = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [sortBy, setSortBy] = useState(columns[0]?.field || 'name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [viewMode, setViewMode] = useState('cards');
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    filterAndSortData();
  }, [data, searchTerm, activeFilters, sortBy, sortDirection]);

  const filterAndSortData = () => {
    let filtered = [...data];

    // Filter by search term
    if (searchTerm && searchFields.length > 0) {
      filtered = filtered.filter(item =>
        searchFields.some(field => {
          const value = getNestedValue(item, field);
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply advanced filters
    Object.entries(activeFilters).forEach(([field, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          filtered = filtered.filter(item => 
            value.some(v => {
              const itemValue = getNestedValue(item, field);
              return itemValue === v || 
                     (typeof itemValue === 'string' && itemValue.toLowerCase().includes(v.toLowerCase())) ||
                     (Array.isArray(itemValue) && itemValue.includes(v));
            })
          );
        } else if (typeof value === 'object' && value.min !== undefined) {
          // Range filter
          filtered = filtered.filter(item => {
            const itemValue = getNestedValue(item, field);
            return itemValue >= value.min && itemValue <= value.max;
          });
        } else {
          filtered = filtered.filter(item => {
            const itemValue = getNestedValue(item, field);
            if (typeof itemValue === 'string') {
              return itemValue.toLowerCase().includes(value.toLowerCase());
            }
            return itemValue === value;
          });
        }
      }
    });

    // Sort data
    filtered.sort((a, b) => {
      let comparison = 0;
      const aValue = getNestedValue(a, sortBy);
      const bValue = getNestedValue(b, sortBy);

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue - bValue;
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    setFilteredData(filtered);
  };

  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const handleViewModeChange = (event, newViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const handleFiltersChange = (filters, search) => {
    setActiveFilters(filters);
    setSearchTerm(search);
  };

  const renderCardView = () => (
    <Grid container spacing={2}>
      {filteredData.map((item, index) => (
        <Grid item xs={12} md={6} lg={4} key={item.id || index}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              {renderCardContent ? renderCardContent(item) : (
                <Box>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {item.name || item.title || 'Untitled'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {item.description || item.summary || 'No description available'}
                  </Typography>
                  {item.status && (
                    <Chip 
                      label={item.status} 
                      color={item.status === 'Active' ? 'success' : item.status === 'Inactive' ? 'error' : 'default'}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                  )}
                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                    <Typography variant="caption" color="text.secondary">
                      {item.lastUpdated || item.updatedAt || 'No date'}
                    </Typography>
                    <Box>
                      <IconButton size="small" onClick={() => onEdit && onEdit(item)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => onDelete && onDelete(item.id || item._id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderListView = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.field}>
                <TableSortLabel
                  active={sortBy === column.field}
                  direction={sortBy === column.field ? sortDirection : 'asc'}
                  onClick={() => handleSort(column.field)}
                >
                  {column.label}
                </TableSortLabel>
              </TableCell>
            ))}
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredData.map((item, index) => (
            <TableRow key={item.id || index} hover>
              {columns.map((column) => (
                <TableCell key={column.field}>
                  {renderListRow ? renderListRow(item, column) : (
                    <Box>
                      {column.field === 'name' || column.field === 'title' ? (
                        <Box>
                          <Typography variant="subtitle2" fontWeight="medium">
                            {getNestedValue(item, column.field)}
                          </Typography>
                          {item.description && (
                            <Typography variant="caption" color="text.secondary">
                              {item.description}
                            </Typography>
                          )}
                        </Box>
                      ) : column.field === 'status' ? (
                        <Chip 
                          label={getNestedValue(item, column.field)} 
                          color={getNestedValue(item, column.field) === 'Active' ? 'success' : 'default'}
                          size="small"
                        />
                      ) : (
                        getNestedValue(item, column.field) || '-'
                      )}
                    </Box>
                  )}
                </TableCell>
              ))}
              <TableCell>
                <Box display="flex" gap={1}>
                  <IconButton size="small" onClick={() => onEdit && onEdit(item)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => onDelete && onDelete(item.id || item._id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAdd}
        >
          {addButtonText}
        </Button>
      </Box>

      {/* Advanced Filters */}
      {showAdvancedFilters && advancedFilters.length > 0 ? (
        <AdvancedFilters
          filters={advancedFilters}
          onFiltersChange={handleFiltersChange}
          searchPlaceholder={searchPlaceholder}
        />
      ) : (
        /* Simple Search and Filter Controls */
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder={searchPlaceholder}
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
            
            {filterOptions.length > 0 && (
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Filter</InputLabel>
                  <Select
                    value={activeFilters.category || 'all'}
                    onChange={(e) => setActiveFilters({...activeFilters, category: e.target.value})}
                    label="Filter"
                  >
                    <MenuItem value="all">All</MenuItem>
                    {filterOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {sortOptions.length > 0 && (
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="Sort By"
                  >
                    {sortOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {showSortDirection && (
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Direction</InputLabel>
                  <Select
                    value={sortDirection}
                    onChange={(e) => setSortDirection(e.target.value)}
                    label="Direction"
                  >
                    <MenuItem value="asc">Ascending</MenuItem>
                    <MenuItem value="desc">Descending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            {showViewToggle && (
              <Grid item xs={12} md={2}>
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={handleViewModeChange}
                  aria-label="view mode"
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="cards" aria-label="card view">
                    <GridIcon />
                  </ToggleButton>
                  <ToggleButton value="list" aria-label="list view">
                    <ListIcon />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            )}

            {showRefresh && (
              <Grid item xs={12} md={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={onRefresh}
                >
                  Refresh
                </Button>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Content */}
      {filteredData.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            {emptyMessage}
          </Typography>
        </Paper>
      ) : (
        viewMode === 'cards' ? renderCardView() : renderListView()
      )}
    </Box>
  );
};

export default UniversalDataView;
