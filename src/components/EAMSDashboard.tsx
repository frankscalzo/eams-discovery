import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Paper,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Apps as AppsIcon,
  AccountTree as DependenciesIcon,
  Assessment as ReportIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon,
  AttachMoney as MoneyIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { FactSheet, Dependency } from '../types/eams';
import InventoryView from './InventoryView';
import DependencyMapEAMS from './DependencyMapEAMS';
import ImpactAnalysis from './ImpactAnalysis';
import ReportingDashboard from './ReportingDashboard';
import { useProject } from '../contexts/ProjectContext';

interface EAMSDashboardProps {
  onFactSheetSelect?: (factSheet: FactSheet) => void;
  onFactSheetEdit?: (factSheet: FactSheet) => void;
  onFactSheetDelete?: (factSheet: FactSheet) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`eams-tabpanel-${index}`}
      aria-labelledby={`eams-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const EAMSDashboard: React.FC<EAMSDashboardProps> = ({
  onFactSheetSelect,
  onFactSheetEdit,
  onFactSheetDelete
}) => {
  const { currentProject } = useProject();
  const [activeTab, setActiveTab] = useState(0);
  const [factSheets, setFactSheets] = useState<FactSheet[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [selectedFactSheet, setSelectedFactSheet] = useState<FactSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Mock fact sheets
        const mockFactSheets: FactSheet[] = [
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
          },
          {
            id: '3',
            type: 'BUSINESS_CAPABILITY',
            name: 'Customer Service',
            description: 'Business capability for customer service operations',
            status: 'ACTIVE',
            tags: ['Customer', 'Service', 'Support'],
            createdAt: new Date('2024-02-01'),
            updatedAt: new Date('2024-09-15'),
            projectId: currentProject?.ProjectID || '',
            owner: 'Lisa Chen',
            cost: 0,
            criticality: 'HIGH',
            data: {
              capabilityName: 'Customer Service',
              description: 'Business capability for customer service operations',
              level: 2,
              owner: { fullName: 'Lisa Chen', email: 'lisa.chen@company.com' },
              maturity: 'MANAGED',
              businessValue: 8,
              applications: ['1']
            }
          }
        ];

        // Mock dependencies
        const mockDependencies: Dependency[] = [
          {
            id: 'dep1',
            sourceId: '1',
            targetId: '2',
            type: 'INTEGRATES_WITH',
            strength: 'STRONG',
            description: 'Customer system integrates with billing for order processing',
            critical: true,
            bidirectional: false
          },
          {
            id: 'dep2',
            sourceId: '3',
            targetId: '1',
            type: 'SUPPORTS',
            strength: 'MEDIUM',
            description: 'Customer service capability supports CRM system',
            critical: false,
            bidirectional: true
          }
        ];

        setFactSheets(mockFactSheets);
        setDependencies(mockDependencies);
      } catch (err) {
        setError('Failed to load data');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentProject]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleFactSheetSelect = (factSheet: FactSheet) => {
    setSelectedFactSheet(factSheet);
    onFactSheetSelect?.(factSheet);
  };

  const handleFactSheetEdit = (factSheet: FactSheet) => {
    onFactSheetEdit?.(factSheet);
  };

  const handleFactSheetDelete = (factSheet: FactSheet) => {
    onFactSheetDelete?.(factSheet);
  };

  const handleDependencyAdd = (dependency: Omit<Dependency, 'id'>) => {
    const newDependency: Dependency = {
      ...dependency,
      id: `dep-${Date.now()}`
    };
    setDependencies(prev => [...prev, newDependency]);
  };

  const handleDependencyEdit = (dependency: Dependency) => {
    setDependencies(prev => 
      prev.map(dep => dep.id === dependency.id ? dependency : dep)
    );
  };

  const handleDependencyDelete = (dependencyId: string) => {
    setDependencies(prev => prev.filter(dep => dep.id !== dependencyId));
  };

  const handleReportGenerate = (report: any) => {
    console.log('Report generated:', report);
  };

  const handleReportExport = (reportId: string, format: string) => {
    console.log('Export report:', reportId, format);
  };

  // Calculate key metrics
  const totalFactSheets = factSheets.length;
  const activeFactSheets = factSheets.filter(fs => fs.status === 'ACTIVE').length;
  const criticalFactSheets = factSheets.filter(fs => fs.criticality === 'CRITICAL').length;
  const totalDependencies = dependencies.length;
  const criticalDependencies = dependencies.filter(dep => dep.critical).length;
  const totalCost = factSheets.reduce((sum, fs) => sum + (fs.cost || 0), 0);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading EAMS Dashboard...</Typography>
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
            Enterprise Architecture Management System (EAMS)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentProject?.ProjectName || 'Project'} - Comprehensive enterprise architecture management
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => {/* Add new fact sheet */}}
          >
            Add Asset
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <AppsIcon color="primary" />
                <Box>
                  <Typography variant="h6">{totalFactSheets}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Assets
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CheckCircleIcon color="success" />
                <Box>
                  <Typography variant="h6">{activeFactSheets}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <ErrorIcon color="error" />
                <Box>
                  <Typography variant="h6">{criticalFactSheets}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Critical
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <DependenciesIcon color="info" />
                <Box>
                  <Typography variant="h6">{totalDependencies}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Dependencies
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <WarningIcon color="warning" />
                <Box>
                  <Typography variant="h6">{criticalDependencies}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Critical Deps
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <MoneyIcon color="success" />
                <Box>
                  <Typography variant="h6">${totalCost.toLocaleString()}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Cost
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="EAMS dashboard tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            icon={<AppsIcon />}
            label="Asset Inventory"
            id="eams-tab-0"
            aria-controls="eams-tabpanel-0"
          />
          <Tab
            icon={<DependenciesIcon />}
            label="Dependencies"
            id="eams-tab-1"
            aria-controls="eams-tabpanel-1"
          />
          <Tab
            icon={<TimelineIcon />}
            label="Impact Analysis"
            id="eams-tab-2"
            aria-controls="eams-tabpanel-2"
          />
          <Tab
            icon={<ReportIcon />}
            label="Reports"
            id="eams-tab-3"
            aria-controls="eams-tabpanel-3"
          />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <InventoryView
            factSheets={factSheets}
            onFactSheetSelect={handleFactSheetSelect}
            onEdit={handleFactSheetEdit}
            onDelete={handleFactSheetDelete}
            showFilters={true}
            showActions={true}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <DependencyMapEAMS
            factSheets={factSheets}
            dependencies={dependencies}
            onDependencyAdd={handleDependencyAdd}
            onDependencyEdit={handleDependencyEdit}
            onDependencyDelete={handleDependencyDelete}
            selectedFactSheetId={selectedFactSheet?.id}
            onFactSheetSelect={(factSheetId) => {
              const factSheet = factSheets.find(fs => fs.id === factSheetId);
              if (factSheet) handleFactSheetSelect(factSheet);
            }}
            showControls={true}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <ImpactAnalysis
            factSheets={factSheets}
            dependencies={dependencies}
            selectedFactSheetId={selectedFactSheet?.id}
            onFactSheetSelect={(factSheetId) => {
              const factSheet = factSheets.find(fs => fs.id === factSheetId);
              if (factSheet) handleFactSheetSelect(factSheet);
            }}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <ReportingDashboard
            factSheets={factSheets}
            dependencies={dependencies}
            onReportGenerate={handleReportGenerate}
            onReportExport={handleReportExport}
          />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default EAMSDashboard;
