import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import {
  AttachMoney as DollarSign,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import Card from './Card';
import Button from './Button';

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
}

interface CostMonitoringProps {
  className?: string;
  showHeader?: boolean;
  compact?: boolean;
  projectId?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function CostMonitoringAdapted({
  className = '',
  showHeader = true,
  compact = false,
  projectId
}: CostMonitoringProps) {
  const [costData, setCostData] = useState<CostData[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('daily');
  const [totalCost, setTotalCost] = useState(0);

  const fetchCostData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // For now, we'll use mock data since we don't have the Lambda deployed yet
      // In production, this would call the cost monitoring Lambda
      const mockData = {
        success: true,
        data: [
          { date: '2024-01-01', cost: 45.67, service: 'Total', project: projectId || 'Application Management' },
          { date: '2024-01-02', cost: 52.34, service: 'Total', project: projectId || 'Application Management' },
          { date: '2024-01-03', cost: 38.91, service: 'Total', project: projectId || 'Application Management' },
          { date: '2024-01-04', cost: 61.23, service: 'Total', project: projectId || 'Application Management' },
          { date: '2024-01-05', cost: 47.89, service: 'Total', project: projectId || 'Application Management' },
          { date: '2024-01-06', cost: 55.12, service: 'Total', project: projectId || 'Application Management' },
          { date: '2024-01-07', cost: 43.78, service: 'Total', project: projectId || 'Application Management' },
        ],
        breakdown: [
          { service: 'Amazon S3', cost: 25.50, percentage: 45.2 },
          { service: 'AWS Lambda', cost: 18.30, percentage: 32.4 },
          { service: 'Amazon DynamoDB', cost: 8.75, percentage: 15.5 },
          { service: 'Amazon CloudFront', cost: 3.95, percentage: 7.0 },
        ],
        totalCost: 56.50,
        period: period,
        startDate: '2024-01-01',
        endDate: '2024-01-07',
      };

      setCostData(mockData.data || []);
      setCostBreakdown(mockData.breakdown || []);
      setTotalCost(mockData.totalCost || 0);

      // TODO: Replace with actual API call when Lambda is deployed
      // const apiPeriod = period === 'weekly' ? 'daily' : period;
      // const response = await fetch(`/api/cost-breakdown?period=${apiPeriod}&projectId=${projectId}`);
      // const data = await response.json();
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

  if (compact) {
    return (
      <Card className={className}>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DollarSign sx={{ color: 'success.main', fontSize: 20 }} />
              <Typography variant="body2" fontWeight="medium">
                Total Cost
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(totalCost)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Last {period}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Card>
    );
  }

  return (
    <Box className={className}>
      {showHeader && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Cost Monitoring
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track and analyze your AWS infrastructure costs
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
            <Button variant="outline" onClick={fetchCostData} disabled={loading}>
              <RefreshIcon sx={{ mr: 1, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </Button>
          </Box>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon />
            <Typography variant="body2">{error}</Typography>
          </Box>
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Total Cost Card */}
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Cost
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatCurrency(totalCost)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last {period} period
                  </Typography>
                </Box>
                <DollarSign sx={{ fontSize: 40, color: 'text.secondary' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Cost Trend Card */}
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Cost Trend
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {costData.length > 1 ? (
                      costData[costData.length - 1].cost > costData[costData.length - 2].cost ? (
                        <Box component="span" color="error.main">↗</Box>
                      ) : (
                        <Box component="span" color="success.main">↘</Box>
                      )
                    ) : (
                      <Box component="span" color="text.secondary">-</Box>
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Compared to previous period
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Services Count Card */}
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Services
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {costBreakdown.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active services
                  </Typography>
                </Box>
                <CalendarIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cost Data Table */}
      {costBreakdown.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="semibold" gutterBottom>
              Service Breakdown
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Service</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Percentage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {costBreakdown.map((item, index) => (
                    <TableRow key={item.service}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
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
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography color="text.secondary">Loading cost data...</Typography>
          </CardContent>
        </Card>
      )}

      {!loading && costBreakdown.length === 0 && !error && (
        <Card sx={{ mt: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">No cost data available</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Cost data may take up to 24 hours to appear
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
