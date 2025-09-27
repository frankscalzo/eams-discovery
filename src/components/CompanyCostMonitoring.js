import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Cloud,
  AttachMoney,
  Download,
  Refresh,
  Settings,
  Warning,
  CheckCircle,
  Info
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import costMonitoringAPI from '../services/costMonitoringAPI';

const CompanyCostMonitoring = ({ company }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [cloudProvider, setCloudProvider] = useState('aws');
  const [timeRange, setTimeRange] = useState('30');
  const [costData, setCostData] = useState(null);
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  useEffect(() => {
    if (company) {
      loadCostData();
      loadBudgetAlerts();
    }
  }, [company, cloudProvider, timeRange]);

  const loadCostData = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));

      const data = await costMonitoringAPI.getCompanyCosts(
        company.CompanyID,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        cloudProvider
      );

      setCostData(data);
    } catch (error) {
      console.error('Error loading cost data:', error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `Failed to load cost data: ${error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const loadBudgetAlerts = async () => {
    try {
      const alerts = await costMonitoringAPI.getBudgetAlerts(company.CompanyID);
      setBudgetAlerts(alerts.alerts || []);
    } catch (error) {
      console.error('Error loading budget alerts:', error);
    }
  };

  const handleCreateReport = async () => {
    try {
      const result = await costMonitoringAPI.createCostReport(
        company.CompanyID,
        null,
        'company_summary',
        {
          timeRange,
          cloudProvider,
          includeBreakdown: true
        }
      );

      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'success',
        message: 'Cost report generated successfully',
        timestamp: new Date()
      }]);

      setReportDialogOpen(false);
    } catch (error) {
      console.error('Error creating report:', error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `Failed to create report: ${error.message}`,
        timestamp: new Date()
      }]);
    }
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendingUp color="error" />;
    if (trend < 0) return <TrendingDown color="success" />;
    return <TrendingUp color="disabled" />;
  };

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'high': return <Warning color="error" />;
      case 'medium': return <Warning color="warning" />;
      case 'low': return <Info color="info" />;
      default: return <CheckCircle color="success" />;
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const renderOverview = () => (
    <Grid container spacing={3}>
      {/* Cost Summary Cards */}
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AttachMoney color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Total Cost</Typography>
            </Box>
            <Typography variant="h4" color="primary">
              ${costData?.totalCost?.toFixed(2) || '0.00'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {timeRange} days
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Cloud color="secondary" sx={{ mr: 1 }} />
              <Typography variant="h6">Cloud Provider</Typography>
            </Box>
            <Typography variant="h4" color="secondary">
              {cloudProvider.toUpperCase()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active services
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {getTrendIcon(5)} {/* Mock trend */}
              <Typography variant="h6">Trend</Typography>
            </Box>
            <Typography variant="h4" color="error">
              +5.2%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              vs last period
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Warning color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6">Alerts</Typography>
            </Box>
            <Typography variant="h4" color="warning.main">
              {budgetAlerts.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active alerts
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Cost Trend Chart */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cost Trend - {timeRange} Days
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={costData?.trends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Cost']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#1976d2" 
                  strokeWidth={2}
                  name="Daily Cost"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Service Breakdown */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Service Breakdown
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costData?.breakdown || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ service, percentage }) => `${service}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="cost"
                >
                  {(costData?.breakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Cost']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderBreakdown = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Service Cost Breakdown
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Service</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Percentage</TableCell>
                    <TableCell align="right">Trend</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(costData?.breakdown || []).map((service, index) => (
                    <TableRow key={service.service}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Cloud sx={{ mr: 1, color: COLORS[index % COLORS.length] }} />
                          {service.service}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        ${service.cost.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        {service.percentage.toFixed(1)}%
                      </TableCell>
                      <TableCell align="right">
                        {getTrendIcon(Math.random() * 10 - 5)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderAlerts = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Budget Alerts & Notifications
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={() => setSettingsDialogOpen(true)}
              >
                Configure Alerts
              </Button>
            </Box>
            
            {budgetAlerts.length === 0 ? (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                  No active alerts
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  All budgets are within limits
                </Typography>
              </Paper>
            ) : (
              <List>
                {budgetAlerts.map((alert, index) => (
                  <React.Fragment key={alert.id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getAlertIcon(alert.severity)}
                            <Typography variant="body1" sx={{ ml: 1 }}>
                              {alert.message}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Threshold: ${alert.threshold} | Actual: ${alert.actual}
                            </Typography>
                            {alert.projectId && (
                              <Chip
                                label={`Project: ${alert.projectId}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ mt: 1 }}
                              />
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end">
                          <Info />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < budgetAlerts.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderReports = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Cost Reports & Analytics
              </Typography>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={() => setReportDialogOpen(true)}
              >
                Generate Report
              </Button>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Monthly Summary
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Comprehensive cost breakdown by service and region
                    </Typography>
                    <Button variant="outlined" size="small" fullWidth>
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Project Allocation
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Cost allocation by project and team
                    </Typography>
                    <Button variant="outlined" size="small" fullWidth>
                      Download CSV
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Forecast Report
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Cost forecasting and budget recommendations
                    </Typography>
                    <Button variant="outlined" size="small" fullWidth>
                      Download Excel
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading cost data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
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

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Cloud Provider</InputLabel>
                <Select
                  value={cloudProvider}
                  onChange={(e) => setCloudProvider(e.target.value)}
                >
                  <MenuItem value="aws">AWS</MenuItem>
                  <MenuItem value="azure">Azure</MenuItem>
                  <MenuItem value="gcp">Google Cloud</MenuItem>
                  <MenuItem value="multi">Multi-Cloud (All Providers)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Time Range</InputLabel>
                <Select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  <MenuItem value="7">Last 7 days</MenuItem>
                  <MenuItem value="30">Last 30 days</MenuItem>
                  <MenuItem value="90">Last 90 days</MenuItem>
                  <MenuItem value="365">Last year</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadCostData}
                fullWidth
              >
                Refresh Data
              </Button>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={() => setReportDialogOpen(true)}
                fullWidth
              >
                Export Report
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Overview" />
            <Tab label="Breakdown" />
            <Tab label="Alerts" />
            <Tab label="Reports" />
          </Tabs>
        </Box>
        
        <CardContent>
          {activeTab === 0 && renderOverview()}
          {activeTab === 1 && renderBreakdown()}
          {activeTab === 2 && renderAlerts()}
          {activeTab === 3 && renderReports()}
        </CardContent>
      </Card>

      {/* Report Generation Dialog */}
      <Dialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate Cost Report</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Report Name"
            fullWidth
            variant="outlined"
            defaultValue={`${company.CompanyName} Cost Report - ${new Date().toLocaleDateString()}`}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Report Type</InputLabel>
            <Select defaultValue="summary">
              <MenuItem value="summary">Summary Report</MenuItem>
              <MenuItem value="detailed">Detailed Breakdown</MenuItem>
              <MenuItem value="forecast">Forecast Report</MenuItem>
              <MenuItem value="allocation">Cost Allocation</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <InputLabel>Format</InputLabel>
            <Select defaultValue="pdf">
              <MenuItem value="pdf">PDF</MenuItem>
              <MenuItem value="excel">Excel</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateReport} variant="contained">
            Generate Report
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompanyCostMonitoring;
