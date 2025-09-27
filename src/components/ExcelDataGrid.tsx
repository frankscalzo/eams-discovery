import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Button,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Typography,
  Divider,
  Toolbar,
  AppBar,
  Tooltip as MuiTooltip,
  Popover,
  List,
  ListItem,
  ListItemButton,
  ListItemSecondaryAction,
  Switch
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  ViewColumn as ViewColumnIcon,
  Sort as SortIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  DragIndicator as DragIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
  type?: 'string' | 'number' | 'date' | 'boolean' | 'select' | 'chip';
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
  options?: string[]; // For select type columns
  colorMap?: Record<string, string>; // For chip type columns
}

interface Filter {
  column: string;
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between';
  value: any;
  value2?: any; // For between operator
}

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

interface ExcelDataGridProps {
  data: any[];
  columns: Column[];
  onDataChange?: (newData: any[]) => void;
  onRowAdd?: (row: any) => void;
  onRowEdit?: (row: any, index: number) => void;
  onRowDelete?: (index: number) => void;
  onColumnReorder?: (newColumns: Column[]) => void;
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void;
  title?: string;
  showToolbar?: boolean;
  showPagination?: boolean;
  showColumnControls?: boolean;
  showFilters?: boolean;
  showSearch?: boolean;
  pageSize?: number;
  height?: number;
  editable?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: any[]) => void;
}

const ExcelDataGrid: React.FC<ExcelDataGridProps> = ({
  data,
  columns,
  onDataChange,
  onRowAdd,
  onRowEdit,
  onRowDelete,
  onColumnReorder,
  onColumnVisibilityChange,
  title,
  showToolbar = true,
  showPagination = true,
  showColumnControls = true,
  showFilters = true,
  showSearch = true,
  pageSize = 25,
  height = 600,
  editable = true,
  selectable = true,
  onSelectionChange
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<any>({});
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [newFilter, setNewFilter] = useState<Filter>({ column: '', operator: 'contains', value: '' });

  // Process data with sorting, filtering, and searching
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchTerm) {
      result = result.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply filters
    filters.forEach(filter => {
      result = result.filter(row => {
        const value = row[filter.column];
        if (value === null || value === undefined) return false;

        switch (filter.operator) {
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'equals':
            return String(value).toLowerCase() === String(filter.value).toLowerCase();
          case 'startsWith':
            return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
          case 'endsWith':
            return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
          case 'greaterThan':
            return Number(value) > Number(filter.value);
          case 'lessThan':
            return Number(value) < Number(filter.value);
          case 'between':
            return Number(value) >= Number(filter.value) && Number(value) <= Number(filter.value2);
          default:
            return true;
        }
      });
    });

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.column];
        const bValue = b[sortConfig.column];
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, filters, sortConfig]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return processedData.slice(start, start + rowsPerPage);
  }, [processedData, page, rowsPerPage]);

  // Handle sorting
  const handleSort = (columnId: string) => {
    setSortConfig(prev => ({
      column: columnId,
      direction: prev?.column === columnId && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle filtering
  const handleAddFilter = () => {
    if (newFilter.column && newFilter.value !== '') {
      setFilters(prev => [...prev, { ...newFilter }]);
      setNewFilter({ column: '', operator: 'contains', value: '' });
      setShowFilterDialog(false);
    }
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearFilters = () => {
    setFilters([]);
    setSearchTerm('');
  };

  // Handle row selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndices = new Set(paginatedData.map((_, index) => page * rowsPerPage + index));
      setSelectedRows(allIndices);
      onSelectionChange?.(paginatedData);
    } else {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedRows(newSelected);
    
    const selectedData = Array.from(newSelected).map(i => data[i]);
    onSelectionChange?.(selectedData);
  };

  // Handle editing
  const handleEditRow = (index: number) => {
    setEditingRow(index);
    setEditingData({ ...data[index] });
  };

  const handleSaveEdit = () => {
    if (editingRow !== null) {
      const newData = [...data];
      newData[editingRow] = editingData;
      onDataChange?.(newData);
      onRowEdit?.(editingData, editingRow);
      setEditingRow(null);
      setEditingData({});
    }
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditingData({});
  };

  const handleDeleteRow = (index: number) => {
    const newData = data.filter((_, i) => i !== index);
    onDataChange?.(newData);
    onRowDelete?.(index);
  };

  // Handle column reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const newColumns = Array.from(columns);
    const [reorderedItem] = newColumns.splice(result.source.index, 1);
    newColumns.splice(result.destination.index, 0, reorderedItem);

    onColumnReorder?.(newColumns);
  };

  // Render cell content based on column type
  const renderCellContent = (value: any, column: Column) => {
    if (editingRow !== null && editingData) {
      return (
        <TextField
          size="small"
          value={editingData[column.id] || ''}
          onChange={(e) => setEditingData(prev => ({ ...prev, [column.id]: e.target.value }))}
          fullWidth
          variant="outlined"
        />
      );
    }

    switch (column.type) {
      case 'chip':
        const color = column.colorMap?.[value] || 'default';
        return <Chip label={value} size="small" color={color} />;
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'number':
        return column.format ? column.format(value) : value?.toLocaleString();
      default:
        return value;
    }
  };

  // Get visible columns
  const visibleColumns = columns.filter(col => col.visible !== false);

  return (
    <Box>
      {/* Toolbar */}
      {showToolbar && (
        <Paper sx={{ mb: 2 }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {title || 'Data Grid'}
            </Typography>
            
            {showSearch && (
              <TextField
                size="small"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                sx={{ mr: 2, minWidth: 200 }}
              />
            )}

            {showFilters && (
              <>
                <Button
                  startIcon={<FilterIcon />}
                  onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
                  sx={{ mr: 1 }}
                >
                  Filters ({filters.length})
                </Button>
                <Menu
                  anchorEl={filterMenuAnchor}
                  open={Boolean(filterMenuAnchor)}
                  onClose={() => setFilterMenuAnchor(null)}
                >
                  <MenuItem onClick={() => setShowFilterDialog(true)}>
                    <ListItemIcon><AddIcon /></ListItemIcon>
                    <ListItemText>Add Filter</ListItemText>
                  </MenuItem>
                  {filters.length > 0 && (
                    <>
                      <Divider />
                      {filters.map((filter, index) => (
                        <MenuItem key={index} onClick={() => handleRemoveFilter(index)}>
                          <ListItemText>
                            {filter.column} {filter.operator} {filter.value}
                          </ListItemText>
                        </MenuItem>
                      ))}
                      <Divider />
                      <MenuItem onClick={handleClearFilters}>
                        <ListItemIcon><ClearIcon /></ListItemIcon>
                        <ListItemText>Clear All</ListItemText>
                      </MenuItem>
                    </>
                  )}
                </Menu>
              </>
            )}

            {showColumnControls && (
              <Button
                startIcon={<ViewColumnIcon />}
                onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
                sx={{ mr: 1 }}
              >
                Columns
              </Button>
            )}

            <Button
              startIcon={<AddIcon />}
              onClick={() => onRowAdd?.({})}
              sx={{ mr: 1 }}
            >
              Add Row
            </Button>

            <Button
              startIcon={<DownloadIcon />}
              onClick={() => {/* Export functionality */}}
            >
              Export
            </Button>
          </Toolbar>
        </Paper>
      )}

      {/* Active Filters */}
      {filters.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {filters.map((filter, index) => (
            <Chip
              key={index}
              label={`${filter.column} ${filter.operator} ${filter.value}`}
              onDelete={() => handleRemoveFilter(index)}
              sx={{ mr: 1, mb: 1 }}
            />
          ))}
          <Button size="small" onClick={handleClearFilters}>
            Clear All
          </Button>
        </Box>
      )}

      {/* Data Table */}
      <TableContainer component={Paper} sx={{ height, overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    indeterminate={selectedRows.size > 0 && selectedRows.size < paginatedData.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
              )}
              {visibleColumns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={sortConfig?.column === column.id}
                      direction={sortConfig?.column === column.id ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
              {editable && (
                <TableCell align="right">Actions</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row, index) => (
              <TableRow
                key={index}
                hover
                selected={selectedRows.has(page * rowsPerPage + index)}
              >
                {selectable && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedRows.has(page * rowsPerPage + index)}
                      onChange={(e) => handleSelectRow(page * rowsPerPage + index, e.target.checked)}
                    />
                  </TableCell>
                )}
                {visibleColumns.map((column) => (
                  <TableCell key={column.id} align={column.align}>
                    {renderCellContent(row[column.id], column)}
                  </TableCell>
                ))}
                {editable && (
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEditRow(page * rowsPerPage + index)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteRow(page * rowsPerPage + index)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {showPagination && (
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={processedData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      )}

      {/* Column Visibility Menu */}
      <Menu
        anchorEl={columnMenuAnchor}
        open={Boolean(columnMenuAnchor)}
        onClose={() => setColumnMenuAnchor(null)}
      >
        {columns.map((column) => (
          <MenuItem key={column.id}>
            <ListItemIcon>
              <Checkbox
                checked={column.visible !== false}
                onChange={(e) => onColumnVisibilityChange?.(column.id, e.target.checked)}
              />
            </ListItemIcon>
            <ListItemText>{column.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onClose={() => setShowFilterDialog(false)}>
        <DialogTitle>Add Filter</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Column</InputLabel>
                <Select
                  value={newFilter.column}
                  onChange={(e) => setNewFilter(prev => ({ ...prev, column: e.target.value }))}
                  label="Column"
                >
                  {columns.map(col => (
                    <MenuItem key={col.id} value={col.id}>{col.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Operator</InputLabel>
                <Select
                  value={newFilter.operator}
                  onChange={(e) => setNewFilter(prev => ({ ...prev, operator: e.target.value as any }))}
                  label="Operator"
                >
                  <MenuItem value="contains">Contains</MenuItem>
                  <MenuItem value="equals">Equals</MenuItem>
                  <MenuItem value="startsWith">Starts With</MenuItem>
                  <MenuItem value="endsWith">Ends With</MenuItem>
                  <MenuItem value="greaterThan">Greater Than</MenuItem>
                  <MenuItem value="lessThan">Less Than</MenuItem>
                  <MenuItem value="between">Between</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Value"
                value={newFilter.value}
                onChange={(e) => setNewFilter(prev => ({ ...prev, value: e.target.value }))}
              />
            </Grid>
            {newFilter.operator === 'between' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Second Value"
                  value={newFilter.value2 || ''}
                  onChange={(e) => setNewFilter(prev => ({ ...prev, value2: e.target.value }))}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFilterDialog(false)}>Cancel</Button>
          <Button onClick={handleAddFilter} variant="contained">Add Filter</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editingRow !== null} onClose={handleCancelEdit} maxWidth="md" fullWidth>
        <DialogTitle>Edit Row</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {visibleColumns.map((column) => (
              <Grid item xs={12} sm={6} key={column.id}>
                <TextField
                  fullWidth
                  label={column.label}
                  value={editingData[column.id] || ''}
                  onChange={(e) => setEditingData(prev => ({ ...prev, [column.id]: e.target.value }))}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExcelDataGrid;
