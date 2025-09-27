import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  AttachMoney as DollarIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { costAPI } from '../services/costAPI';

interface CostData {
  date: string;
  cost: number;
  service: string;
  project?: string;
}

interface CostBreakdown {
  service: string;
  cost: number;
  percentage: number;
  category: string;
}

interface CostMonitoringProps {
  projectId?: string;
  className?: string;
  showHeader?: boolean;
  compact?: boolean;
  showCharts?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const SERVICE_ICONS: { [key: string]: React.ReactElement } = {
  'EC2': <CloudIcon />,
  'S3': <StorageIcon />,
  'DynamoDB': <MemoryIcon />,
  'Lambda': <SpeedIcon />,
  'CloudFront': <CloudIcon />,
  'Cognito': <CloudIcon />,
  'API Gateway': <CloudIcon />,
  'RDS': <StorageIcon />,
  'ElastiCache': <MemoryIcon />,
  'ECS': <CloudIcon />,
  'EKS': <CloudIcon />,
  'SNS': <CloudIcon />,
  'SQS': <CloudIcon />,
  'CloudWatch': <CloudIcon />,
  'Route 53': <CloudIcon />,
  'VPC': <CloudIcon />,
  'IAM': <CloudIcon />,
  'KMS': <CloudIcon />,
  'Secrets Manager': <CloudIcon />,
  'Systems Manager': <CloudIcon />
};

export default function CostMonitoring({
  projectId,
  className = '',
  showHeader = true,
  compact = false,
  showCharts = true
}: CostMonitoringProps) {
  const [costData, setCostData] = useState<CostData[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('daily');
  const [totalCost, setTotalCost] = useState(0);
  const [budget, setBudget] = useState(1000);
  const [budgetAlert, setBudgetAlert] = useState(false);

  const fetchCostData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await costAPI.getCostData(projectId, period);
      
      setCostData(data.costData || []);
      setCostBreakdown(data.breakdown || []);
      setTotalCost(data.totalCost || 0);
      setBudget(data.budget || 1000);
      setBudgetAlert((data.totalCost || 0) > (data.budget || 1000) * 0.8);
    } catch (err) {
      console.error('Error fetching cost data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch cost data');
    } finally {
      setLoading(false);
    }
  }, [period, projectId]);

  useEffect(() => {
    fetchCostData();
  }, [fetchCostData]);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getCostTrend = () => {
    if (costData.length < 2) return { trend: 'stable', percentage: 0 };
    
    const current = costData[costData.length - 1].cost;
    const previous = costData[costData.length - 2].cost;
    const percentage = ((current - previous) / previous) * 100;
    
    return {
      trend: current > previous ? 'up' : current < previous ? 'down' : 'stable',
      percentage: Math.abs(percentage)
    };
  };

  const getBudgetUtilization = () => {
    return Math.min((totalCost / budget) * 100, 100);
  };

  const getServiceIcon = (service: string) => {
    return SERVICE_ICONS[service] || <CloudIcon />;
  };

  if (compact) {
    return (
      <Card className={className} sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <DollarIcon color="success" />
              <Typography variant="body2" color="text.secondary">
                Total Cost
              </Typography>
            </Box>
            <Box textAlign="right">
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(totalCost)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Last {period}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const trend = getCostTrend();
  const budgetUtilization = getBudgetUtilization();

  return (
    <Box className={className}>
      {showHeader && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Cost Monitoring
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track and analyze your AWS infrastructure costs
              {projectId && ` for Project ${projectId}`}
            </Typography>
          </Box>
          <Box display="flex" gap={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Period</InputLabel>
              <Select
                value={period}
                onChange={(e) => handlePeriodChange(e.target.value)}
                label="Period"
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Refresh cost data">
              <IconButton onClick={fetchCostData} disabled={loading}>
                <RefreshIcon className={loading ? 'animate-spin' : ''} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <WarningIcon />
          {error}
        </Alert>
      )}

      {budgetAlert && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <InfoIcon />
          You've used {budgetUtilization.toFixed(1)}% of your budget. Consider reviewing your costs.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Total Cost Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Cost
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatCurrency(totalCost)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last {period} period
                  </Typography>
                </Box>
                <DollarIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Cost Trend Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Cost Trend
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {trend.trend === 'up' && <TrendingUpIcon color="error" />}
                    {trend.trend === 'down' && <TrendingDownIcon color="success" />}
                    {trend.trend === 'stable' && <Typography variant="h4">-</Typography>}
                    <Typography variant="h4" fontWeight="bold">
                      {trend.percentage > 0 && `${trend.percentage.toFixed(1)}%`}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    vs previous period
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Budget Utilization Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box flex={1}>
                  <Typography color="text.secondary" gutterBottom>
                    Budget Utilization
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {budgetUtilization.toFixed(1)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={budgetUtilization} 
                    color={budgetUtilization > 80 ? 'error' : budgetUtilization > 60 ? 'warning' : 'success'}
                    sx={{ mt: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatCurrency(totalCost)} / {formatCurrency(budget)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Services Count Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Services
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {costBreakdown.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active services
                  </Typography>
                </Box>
                <CloudIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {showCharts && costData.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Cost Trend Chart */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Cost Trend Over Time
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={costData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                      tick={{ fontSize: 12 }}
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Cost']}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cost" 
                      stroke="#0088FE" 
                      strokeWidth={2}
                      dot={{ fill: '#0088FE', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Service Breakdown Pie Chart */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Service Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="cost"
                    >
                      {costBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => [formatCurrency(value), 'Cost']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Service Breakdown Table */}
      {costBreakdown.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Service Breakdown
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Service</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Percentage</TableCell>
                    <TableCell align="center">Category</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {costBreakdown.map((item, index) => (
                    <TableRow key={item.service} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box color={COLORS[index % COLORS.length]}>
                            {getServiceIcon(item.service)}
                          </Box>
                          <Typography variant="body2" fontWeight="medium">
                            {item.service}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(item.cost)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {item.percentage.toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={item.category} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box display="flex" flexDirection="column" alignItems="center" py={4}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Loading cost data...
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {!loading && costBreakdown.length === 0 && !error && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box display="flex" flexDirection="column" alignItems="center" py={4}>
              <InfoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No cost data available
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Cost data may take up to 24 hours to appear
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
