import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Paper,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  AccountTree as DependenciesIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon
} from '@mui/icons-material';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  EdgeChange,
  NodeChange,
  MarkerType,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FactSheet, Dependency, DependencyType, DependencyStrength } from '../types/eams';

interface DependencyMapEAMSProps {
  factSheets: FactSheet[];
  dependencies: Dependency[];
  onDependencyAdd?: (dependency: Omit<Dependency, 'id'>) => void;
  onDependencyEdit?: (dependency: Dependency) => void;
  onDependencyDelete?: (dependencyId: string) => void;
  selectedFactSheetId?: string;
  onFactSheetSelect?: (factSheetId: string) => void;
  showControls?: boolean;
  compact?: boolean;
}

const DependencyMapEAMS: React.FC<DependencyMapEAMSProps> = ({
  factSheets,
  dependencies,
  onDependencyAdd,
  onDependencyEdit,
  onDependencyDelete,
  selectedFactSheetId,
  onFactSheetSelect,
  showControls = true,
  compact = false
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; nodeId?: string } | null>(null);
  const [showAddDependency, setShowAddDependency] = useState(false);
  const [newDependency, setNewDependency] = useState<Partial<Dependency>>({});
  const [filter, setFilter] = useState<string>('');
  const [dependencyTypeFilter, setDependencyTypeFilter] = useState<DependencyType | ''>('');

  // Convert fact sheets to nodes
  const convertToNodes = useCallback((factSheets: FactSheet[]): Node[] => {
    return factSheets.map((factSheet) => ({
      id: factSheet.id,
      type: 'default',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        label: factSheet.name,
        factSheet,
        type: factSheet.type,
        status: factSheet.status,
        criticality: factSheet.criticality
      },
      style: {
        background: getNodeColor(factSheet.criticality, factSheet.status),
        color: '#fff',
        border: selectedFactSheetId === factSheet.id ? '3px solid #1976d2' : '1px solid #ccc',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 'bold',
        minWidth: 120,
        textAlign: 'center'
      }
    }));
  }, [selectedFactSheetId]);

  // Convert dependencies to edges
  const convertToEdges = useCallback((dependencies: Dependency[]): Edge[] => {
    return dependencies.map((dependency) => ({
      id: dependency.id,
      source: dependency.sourceId,
      target: dependency.targetId,
      type: 'smoothstep',
      animated: dependency.critical,
      style: {
        stroke: getEdgeColor(dependency.type, dependency.strength),
        strokeWidth: getEdgeWidth(dependency.strength)
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: getEdgeColor(dependency.type, dependency.strength)
      },
      label: dependency.type.replace('_', ' '),
      labelStyle: {
        fontSize: 10,
        fontWeight: 'bold'
      },
      data: { dependency }
    }));
  }, []);

  // Update nodes and edges when data changes
  useEffect(() => {
    const filteredFactSheets = factSheets.filter(fs => 
      !filter || fs.name.toLowerCase().includes(filter.toLowerCase())
    );
    
    const filteredDependencies = dependencies.filter(dep => 
      !dependencyTypeFilter || dep.type === dependencyTypeFilter
    );

    setNodes(convertToNodes(filteredFactSheets));
    setEdges(convertToEdges(filteredDependencies));
  }, [factSheets, dependencies, filter, dependencyTypeFilter, convertToNodes, convertToEdges]);

  const getNodeColor = (criticality: string, status: string) => {
    if (status === 'SUNSET') return '#f44336';
    if (status === 'PHASE_OUT') return '#ff9800';
    if (criticality === 'CRITICAL') return '#d32f2f';
    if (criticality === 'HIGH') return '#f57c00';
    if (criticality === 'MEDIUM') return '#1976d2';
    return '#4caf50';
  };

  const getEdgeColor = (type: DependencyType, strength: DependencyStrength) => {
    if (type === 'DEPENDS_ON') return '#f44336';
    if (type === 'INTEGRATES_WITH') return '#2196f3';
    if (type === 'REPLACES') return '#ff9800';
    if (type === 'SUPPORTS') return '#4caf50';
    if (type === 'CONSUMES') return '#9c27b0';
    if (type === 'PROVIDES') return '#00bcd4';
    return '#757575';
  };

  const getEdgeWidth = (strength: DependencyStrength) => {
    if (strength === 'STRONG') return 3;
    if (strength === 'MEDIUM') return 2;
    return 1;
  };

  const onConnect = useCallback((params: Connection) => {
    if (onDependencyAdd) {
      const newDep: Omit<Dependency, 'id'> = {
        sourceId: params.source!,
        targetId: params.target!,
        type: 'DEPENDS_ON',
        strength: 'MEDIUM',
        description: '',
        critical: false,
        bidirectional: false
      };
      onDependencyAdd(newDep);
    }
  }, [onDependencyAdd]);

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    if (onFactSheetSelect) {
      onFactSheetSelect(node.id);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, node?: Node) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
      nodeId: node?.id
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleAddDependency = () => {
    if (selectedNode && onDependencyAdd) {
      setNewDependency({
        sourceId: selectedNode.id,
        type: 'DEPENDS_ON',
        strength: 'MEDIUM',
        critical: false,
        bidirectional: false
      });
      setShowAddDependency(true);
    }
    handleCloseContextMenu();
  };

  const handleEditDependency = (edge: Edge) => {
    if (onDependencyEdit && edge.data?.dependency) {
      onDependencyEdit(edge.data.dependency);
    }
  };

  const handleDeleteDependency = (edge: Edge) => {
    if (onDependencyDelete && edge.data?.dependency) {
      onDependencyDelete(edge.data.dependency.id);
    }
  };

  const handleSaveDependency = () => {
    if (onDependencyAdd && newDependency.sourceId && newDependency.targetId) {
      onDependencyAdd(newDependency as Omit<Dependency, 'id'>);
      setShowAddDependency(false);
      setNewDependency({});
    }
  };

  const getDependencyStats = () => {
    const totalDependencies = dependencies.length;
    const criticalDependencies = dependencies.filter(d => d.critical).length;
    const bidirectionalDependencies = dependencies.filter(d => d.bidirectional).length;
    
    return { totalDependencies, criticalDependencies, bidirectionalDependencies };
  };

  const stats = getDependencyStats();

  if (compact) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Dependencies</Typography>
            <Chip label={`${stats.totalDependencies} total`} size="small" />
          </Box>
          <Box height={300}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onPaneContextMenu={handleContextMenu}
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>
          </Box>
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
            Dependency Map
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visualize relationships between fact sheets
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => setShowAddDependency(true)}
          >
            Add Dependency
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <DependenciesIcon color="primary" />
                <Box>
                  <Typography variant="h6">{stats.totalDependencies}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Dependencies
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <WarningIcon color="warning" />
                <Box>
                  <Typography variant="h6">{stats.criticalDependencies}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Critical Dependencies
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <InfoIcon color="info" />
                <Box>
                  <Typography variant="h6">{stats.bidirectionalDependencies}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Bidirectional
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search fact sheets..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Dependency Type</InputLabel>
                <Select
                  value={dependencyTypeFilter}
                  onChange={(e) => setDependencyTypeFilter(e.target.value as DependencyType)}
                  label="Dependency Type"
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="DEPENDS_ON">Depends On</MenuItem>
                  <MenuItem value="INTEGRATES_WITH">Integrates With</MenuItem>
                  <MenuItem value="REPLACES">Replaces</MenuItem>
                  <MenuItem value="SUPPORTS">Supports</MenuItem>
                  <MenuItem value="CONSUMES">Consumes</MenuItem>
                  <MenuItem value="PROVIDES">Provides</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" gap={1}>
                <Button
                  startIcon={<ZoomInIcon />}
                  variant="outlined"
                  size="small"
                >
                  Zoom In
                </Button>
                <Button
                  startIcon={<ZoomOutIcon />}
                  variant="outlined"
                  size="small"
                >
                  Zoom Out
                </Button>
                <Button
                  startIcon={<FullscreenIcon />}
                  variant="outlined"
                  size="small"
                >
                  Fit View
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Dependency Map */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box height={600}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onPaneContextMenu={handleContextMenu}
              onEdgeClick={(event, edge) => {
                event.stopPropagation();
                // Handle edge click for editing
              }}
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>
          </Box>
        </CardContent>
      </Card>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleAddDependency}>
          <ListItemIcon>
            <AddIcon />
          </ListItemIcon>
          <ListItemText>Add Dependency</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {/* View details */}}>
          <ListItemIcon>
            <ViewIcon />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
      </Menu>

      {/* Add Dependency Dialog */}
      <Dialog
        open={showAddDependency}
        onClose={() => setShowAddDependency(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Dependency</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Source</InputLabel>
                <Select
                  value={newDependency.sourceId || ''}
                  onChange={(e) => setNewDependency(prev => ({ ...prev, sourceId: e.target.value }))}
                  label="Source"
                >
                  {factSheets.map(fs => (
                    <MenuItem key={fs.id} value={fs.id}>{fs.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Target</InputLabel>
                <Select
                  value={newDependency.targetId || ''}
                  onChange={(e) => setNewDependency(prev => ({ ...prev, targetId: e.target.value }))}
                  label="Target"
                >
                  {factSheets.map(fs => (
                    <MenuItem key={fs.id} value={fs.id}>{fs.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newDependency.type || 'DEPENDS_ON'}
                  onChange={(e) => setNewDependency(prev => ({ ...prev, type: e.target.value as DependencyType }))}
                  label="Type"
                >
                  <MenuItem value="DEPENDS_ON">Depends On</MenuItem>
                  <MenuItem value="INTEGRATES_WITH">Integrates With</MenuItem>
                  <MenuItem value="REPLACES">Replaces</MenuItem>
                  <MenuItem value="SUPPORTS">Supports</MenuItem>
                  <MenuItem value="CONSUMES">Consumes</MenuItem>
                  <MenuItem value="PROVIDES">Provides</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Strength</InputLabel>
                <Select
                  value={newDependency.strength || 'MEDIUM'}
                  onChange={(e) => setNewDependency(prev => ({ ...prev, strength: e.target.value as DependencyStrength }))}
                  label="Strength"
                >
                  <MenuItem value="STRONG">Strong</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="WEAK">Weak</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newDependency.description || ''}
                onChange={(e) => setNewDependency(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDependency(false)}>Cancel</Button>
          <Button onClick={handleSaveDependency} variant="contained">
            Add Dependency
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DependencyMapEAMS;
