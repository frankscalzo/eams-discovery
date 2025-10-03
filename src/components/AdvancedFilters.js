import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  IconButton,
  Collapse,
  Paper,
  Grid,
  Autocomplete,
  Slider,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';

const AdvancedFilters = ({
  filters = [],
  onFiltersChange,
  searchPlaceholder = "Search...",
  showAdvanced = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [expandedFilters, setExpandedFilters] = useState({});
  const [customFilters, setCustomFilters] = useState([]);

  useEffect(() => {
    // Initialize filters
    const initialFilters = {};
    filters.forEach(filter => {
      if (filter.defaultValue !== undefined) {
        initialFilters[filter.field] = filter.defaultValue;
      }
    });
    setActiveFilters(initialFilters);
  }, [filters]);

  const handleFilterChange = (field, value) => {
    const newFilters = { ...activeFilters, [field]: value };
    setActiveFilters(newFilters);
    onFiltersChange(newFilters, searchTerm);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    onFiltersChange(activeFilters, value);
  };

  const handleClearFilter = (field) => {
    const newFilters = { ...activeFilters };
    delete newFilters[field];
    setActiveFilters(newFilters);
    onFiltersChange(newFilters, searchTerm);
  };

  const handleClearAll = () => {
    setActiveFilters({});
    setSearchTerm('');
    onFiltersChange({}, '');
  };

  const toggleFilterExpansion = (field) => {
    setExpandedFilters(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const addCustomFilter = () => {
    const newFilter = {
      id: `custom_${Date.now()}`,
      field: 'custom',
      label: 'Custom Filter',
      type: 'text',
      placeholder: 'Enter custom filter...'
    };
    setCustomFilters([...customFilters, newFilter]);
  };

  const removeCustomFilter = (id) => {
    setCustomFilters(customFilters.filter(f => f.id !== id));
  };

  const renderFilterControl = (filter) => {
    const value = activeFilters[filter.field] || '';

    switch (filter.type) {
      case 'select':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{filter.label}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleFilterChange(filter.field, e.target.value)}
              label={filter.label}
            >
              <MenuItem value="">All {filter.label}</MenuItem>
              {filter.options?.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'multiselect':
        return (
          <Autocomplete
            multiple
            size="small"
            options={filter.options || []}
            getOptionLabel={(option) => option.label || option}
            value={value || []}
            onChange={(event, newValue) => handleFilterChange(filter.field, newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label={filter.label}
                placeholder={`Select ${filter.label}...`}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option.label || option}
                  size="small"
                  {...getTagProps({ index })}
                />
              ))
            }
          />
        );

      case 'range':
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              {filter.label}: {value[0]} - {value[1]}
            </Typography>
            <Slider
              value={value || filter.defaultValue || [0, 100]}
              onChange={(event, newValue) => handleFilterChange(filter.field, newValue)}
              valueLabelDisplay="auto"
              min={filter.min || 0}
              max={filter.max || 100}
              step={filter.step || 1}
            />
          </Box>
        );

      case 'date':
        return (
          <TextField
            fullWidth
            size="small"
            type="date"
            label={filter.label}
            value={value}
            onChange={(e) => handleFilterChange(filter.field, e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        );

      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={value || false}
                onChange={(e) => handleFilterChange(filter.field, e.target.checked)}
              />
            }
            label={filter.label}
          />
        );

      case 'text':
      default:
        return (
          <TextField
            fullWidth
            size="small"
            label={filter.label}
            placeholder={filter.placeholder || `Filter by ${filter.label}...`}
            value={value}
            onChange={(e) => handleFilterChange(filter.field, e.target.value)}
          />
        );
    }
  };

  const getActiveFilterCount = () => {
    return Object.keys(activeFilters).filter(key => {
      const value = activeFilters[key];
      if (Array.isArray(value)) return value.length > 0;
      return value !== '' && value !== null && value !== undefined;
    }).length;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      {/* Search Bar */}
      <Box mb={2}>
        <TextField
          fullWidth
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => handleSearchChange('')}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <Box mb={2}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Typography variant="subtitle2">Active Filters:</Typography>
            <Button size="small" onClick={handleClearAll} startIcon={<ClearIcon />}>
              Clear All
            </Button>
          </Box>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {Object.entries(activeFilters).map(([field, value]) => {
              if (!value || (Array.isArray(value) && value.length === 0)) return null;
              
              const filter = filters.find(f => f.field === field);
              const displayValue = Array.isArray(value) 
                ? value.map(v => v.label || v).join(', ')
                : value;
              
              return (
                <Chip
                  key={field}
                  label={`${filter?.label || field}: ${displayValue}`}
                  onDelete={() => handleClearFilter(field)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              );
            })}
          </Box>
        </Box>
      )}

      {/* Advanced Filters */}
      {showAdvanced && (
        <Box>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle2">
              Advanced Filters ({activeFilterCount})
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addCustomFilter}>
              Add Custom
            </Button>
          </Box>

          <Grid container spacing={2}>
            {filters.map((filter) => (
              <Grid item xs={12} sm={6} md={4} key={filter.field}>
                <Accordion 
                  expanded={expandedFilters[filter.field] || false}
                  onChange={() => toggleFilterExpansion(filter.field)}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" width="100%">
                      <FilterIcon fontSize="small" sx={{ mr: 1 }} />
                      <Typography variant="body2">
                        {filter.label}
                        {activeFilters[filter.field] && (
                          <Chip 
                            label="Active" 
                            size="small" 
                            color="primary" 
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {renderFilterControl(filter)}
                  </AccordionDetails>
                </Accordion>
              </Grid>
            ))}

            {/* Custom Filters */}
            {customFilters.map((filter) => (
              <Grid item xs={12} sm={6} md={4} key={filter.id}>
                <Box display="flex" alignItems="center" gap={1}>
                  <TextField
                    fullWidth
                    size="small"
                    label={filter.label}
                    placeholder={filter.placeholder}
                    value={activeFilters[filter.id] || ''}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                  />
                  <IconButton 
                    size="small" 
                    onClick={() => removeCustomFilter(filter.id)}
                    color="error"
                  >
                    <RemoveIcon />
                  </IconButton>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Paper>
  );
};

export default AdvancedFilters;



