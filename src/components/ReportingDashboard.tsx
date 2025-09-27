import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountTree as DependenciesIcon,
  Apps as AppsIcon,
  Business as BusinessIcon,
  Build as BuildIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { FactSheet, Dependency, InventoryReport, ReportType } from '../types/eams';

interface ReportingDashboardProps {
  factSheets: FactSheet[];
  dependencies: Dependency[];
  onReportGenerate?: (report: InventoryReport) => void;
  onReportExport?: (reportId: string, format: 'pdf' | 'excel' | 'csv') => void;
}

const ReportingDashboard: React.FC<ReportingDashboardProps> = ({
  factSheets,
  dependencies,
  onReportGenerate,
  onReportExport
}) => {
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('INVENTORY');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [newReport, setNewReport] = useState<Partial<InventoryReport>>({});
  const [reports, setReports] = useState<InventoryReport[]>([]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalFactSheets = factSheets.length;
    const activeFactSheets = factSheets.filter(fs => fs.status === 'ACTIVE').length;
    const criticalFactSheets = factSheets.filter(fs => fs.criticality === 'CRITICAL').length;
    const totalDependencies = dependencies.length;
    const criticalDependencies = dependencies.filter(dep => dep.critical).length;
    const totalCost = factSheets.reduce((sum, fs) => sum + (fs.cost || 0), 0);
    const averageCost = totalFactSheets > 0 ? totalCost / totalFactSheets : 0;

    // Lifecycle distribution
    const lifecycleDistribution = factSheets.reduce((acc, fs) => {
      acc[fs.status] = (acc[fs.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Criticality distribution
    const criticalityDistribution = factSheets.reduce((acc, fs) => {
      acc[fs.criticality] = (acc[fs.criticality] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Type distribution
    const typeDistribution = factSheets.reduce((acc, fs) => {
      acc[fs.type] = (acc[fs.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Cost trend (mock data for now)
    const costTrend = [
      { month: 'Jan', cost: 45000 },
      { month: 'Feb', cost: 52000 },
      { month: 'Mar', cost: 48000 },
      { month: 'Apr', cost: 61000 },
      { month: 'May', cost: 55000 },
      { month: 'Jun', cost: 58000 }
    ];

    return {
      totalFactSheets,
      activeFactSheets,
      criticalFactSheets,
      totalDependencies,
      criticalDependencies,
      totalCost,
      averageCost,
      lifecycleDistribution,
      criticalityDistribution,
      typeDistribution,
      costTrend
    };
  }, [factSheets, dependencies]);

  // Generate reports
  const generateInventoryReport = () => {
    const report: InventoryReport = {
      id: `report-${Date.now()}`,
      name: 'Inventory Report',
      description: 'Complete inventory of all fact sheets',
      type: 'INVENTORY',
      filters: {},
      columns: ['name', 'type', 'status', 'criticality', 'owner', 'cost'],
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: 'current'
    };
    setReports(prev => [...prev, report]);
    onReportGenerate?.(report);
  };

  const generateDependencyMatrixReport = () => {
    const report: InventoryReport = {
      id: `report-${Date.now()}`,
      name: 'Dependency Matrix Report',
      description: 'Matrix view of all dependencies between fact sheets',
      type: 'DEPENDENCY_MATRIX',
      filters: {},
      columns: ['source', 'target', 'type', 'strength', 'critical'],
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: 'current'
    };
    setReports(prev => [...prev, report]);
    onReportGenerate?.(report);
  };

  const generateLifecycleAnalysisReport = () => {
    const report: InventoryReport = {
      id: `report-${Date.now()}`,
      name: 'Lifecycle Analysis Report',
      description: 'Analysis of fact sheets by lifecycle status',
      type: 'LIFECYCLE_ANALYSIS',
      filters: {},
      columns: ['name', 'status', 'createdAt', 'updatedAt', 'cost'],
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: 'current'
    };
    setReports(prev => [...prev, report]);
    onReportGenerate?.(report);
  };

  const generateCostAnalysisReport = () => {
    const report: InventoryReport = {
      id: `report-${Date.now()}`,
      name: 'Cost Analysis Report',
      description: 'Cost breakdown and analysis of all fact sheets',
      type: 'COST_ANALYSIS',
      filters: {},
      columns: ['name', 'type', 'cost', 'criticality', 'status'],
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: 'current'
    };
    setReports(prev => [...prev, report]);
    onReportGenerate?.(report);
  };

  const generateRiskAssessmentReport = () => {
    const report: InventoryReport = {
      id: `report-${Date.now()}`,
      name: 'Risk Assessment Report',
      description: 'Risk assessment based on criticality and dependencies',
      type: 'RISK_ASSESSMENT',
      filters: {},
      columns: ['name', 'criticality', 'dependencies', 'riskScore', 'recommendations'],
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: 'current'
    };
    setReports(prev => [...prev, report]);
    onReportGenerate?.(report);
  };

  const handleCreateCustomReport = () => {
    const report: InventoryReport = {
      id: `report-${Date.now()}`,
      name: newReport.name || 'Custom Report',
      description: newReport.description || '',
      type: newReport.type || 'INVENTORY',
      filters: newReport.filters || {},
      columns: newReport.columns || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: 'current'
    };
    setReports(prev => [...prev, report]);
    setShowReportDialog(false);
    setNewReport({});
    onReportGenerate?.(report);
  };

  const handleExportReport = (reportId: string, format: 'pdf' | 'excel' | 'csv') => {
    onReportExport?.(reportId, format);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Reporting Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generate and analyze reports for your enterprise architecture
          </Typography>
        </Box>
        <Button
          startIcon={<AssessmentIcon />}
          variant="contained"
          onClick={() => setShowReportDialog(true)}
        >
          Create Custom Report
        </Button>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <AppsIcon color="primary" />
                <Box>
                  <Typography variant="h4">{metrics.totalFactSheets}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Fact Sheets
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CheckCircleIcon color="success" />
                <Box>
                  <Typography variant="h4">{metrics.activeFactSheets}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Systems
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <ErrorIcon color="error" />
                <Box>
                  <Typography variant="h4">{metrics.criticalFactSheets}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Critical Systems
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <MoneyIcon color="info" />
                <Box>
                  <Typography variant="h4">${metrics.totalCost.toLocaleString()}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Cost
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Lifecycle Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Lifecycle Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(metrics.lifecycleDistribution).map(([key, value]) => ({
                      name: key,
                      value
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(metrics.lifecycleDistribution).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Criticality Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Criticality Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(metrics.criticalityDistribution).map(([key, value]) => ({
                  name: key,
                  value
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Cost Trend */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cost Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.costTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="cost" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Report Generation */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Reports
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AppsIcon />}
                onClick={generateInventoryReport}
              >
                Inventory
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<DependenciesIcon />}
                onClick={generateDependencyMatrixReport}
              >
                Dependencies
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<TimelineIcon />}
                onClick={generateLifecycleAnalysisReport}
              >
                Lifecycle
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<MoneyIcon />}
                onClick={generateCostAnalysisReport}
              >
                Cost Analysis
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<WarningIcon />}
                onClick={generateRiskAssessmentReport}
              >
                Risk Assessment
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AssessmentIcon />}
                onClick={() => setShowReportDialog(true)}
              >
                Custom Report
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Generated Reports */}
      {reports.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Generated Reports
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Report Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {report.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {report.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={report.type.replace('_', ' ')} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {report.createdAt.toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label="Ready" 
                          size="small" 
                          color="success"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Export PDF">
                          <IconButton
                            size="small"
                            onClick={() => handleExportReport(report.id, 'pdf')}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Export Excel">
                          <IconButton
                            size="small"
                            onClick={() => handleExportReport(report.id, 'excel')}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Share">
                          <IconButton
                            size="small"
                            onClick={() => {/* Share report */}}
                          >
                            <ShareIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Create Custom Report Dialog */}
      <Dialog
        open={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Custom Report</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Report Name"
                value={newReport.name || ''}
                onChange={(e) => setNewReport(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={newReport.type || 'INVENTORY'}
                  onChange={(e) => setNewReport(prev => ({ ...prev, type: e.target.value as ReportType }))}
                  label="Report Type"
                >
                  <MenuItem value="INVENTORY">Inventory</MenuItem>
                  <MenuItem value="DEPENDENCY_MATRIX">Dependency Matrix</MenuItem>
                  <MenuItem value="LIFECYCLE_ANALYSIS">Lifecycle Analysis</MenuItem>
                  <MenuItem value="COST_ANALYSIS">Cost Analysis</MenuItem>
                  <MenuItem value="RISK_ASSESSMENT">Risk Assessment</MenuItem>
                  <MenuItem value="IMPACT_ANALYSIS">Impact Analysis</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newReport.description || ''}
                onChange={(e) => setNewReport(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReportDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateCustomReport} variant="contained">
            Create Report
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportingDashboard;
