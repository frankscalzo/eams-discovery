import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  LinearProgress,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  AccountTree as DependenciesIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { FactSheet, Dependency, ImpactAnalysis as ImpactAnalysisType } from '../types/eams';

interface ImpactAnalysisProps {
  factSheets: FactSheet[];
  dependencies: Dependency[];
  selectedFactSheetId?: string;
  onFactSheetSelect?: (factSheetId: string) => void;
}

const ImpactAnalysis: React.FC<ImpactAnalysisProps> = ({
  factSheets,
  dependencies,
  selectedFactSheetId,
  onFactSheetSelect
}) => {
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [impactType, setImpactType] = useState<'CHANGE' | 'DEPRECATION' | 'MIGRATION' | 'UPGRADE'>('CHANGE');
  const [analysisResults, setAnalysisResults] = useState<ImpactAnalysisType[]>([]);
  const [loading, setLoading] = useState(false);

  // Calculate impact analysis
  const calculateImpact = useMemo(() => {
    if (!selectedSource) return [];

    const sourceFactSheet = factSheets.find(fs => fs.id === selectedSource);
    if (!sourceFactSheet) return [];

    // Find all dependencies where the selected fact sheet is involved
    const relatedDependencies = dependencies.filter(dep => 
      dep.sourceId === selectedSource || dep.targetId === selectedSource
    );

    // Find affected fact sheets
    const affectedIds = new Set<string>();
    relatedDependencies.forEach(dep => {
      if (dep.sourceId === selectedSource) {
        affectedIds.add(dep.targetId);
      } else {
        affectedIds.add(dep.sourceId);
      }
    });

    // Calculate impact for each affected fact sheet
    const impacts: ImpactAnalysisType[] = Array.from(affectedIds).map(affectedId => {
      const affectedFactSheet = factSheets.find(fs => fs.id === affectedId);
      if (!affectedFactSheet) return null;

      // Calculate severity based on dependency strength and fact sheet criticality
      const directDependencies = relatedDependencies.filter(dep => 
        (dep.sourceId === selectedSource && dep.targetId === affectedId) ||
        (dep.targetId === selectedSource && dep.sourceId === affectedId)
      );

      const maxStrength = directDependencies.reduce((max, dep) => {
        const strengthValue = dep.strength === 'STRONG' ? 3 : dep.strength === 'MEDIUM' ? 2 : 1;
        return Math.max(max, strengthValue);
      }, 0);

      const criticalityValue = affectedFactSheet.criticality === 'CRITICAL' ? 3 : 
                              affectedFactSheet.criticality === 'HIGH' ? 2 : 
                              affectedFactSheet.criticality === 'MEDIUM' ? 1 : 0;

      const severityScore = maxStrength + criticalityValue;
      const severity = severityScore >= 5 ? 'HIGH' : severityScore >= 3 ? 'MEDIUM' : 'LOW';

      // Generate recommendations
      const recommendations = generateRecommendations(affectedFactSheet, directDependencies, impactType);

      // Estimate cost and effort
      const estimatedCost = estimateCost(affectedFactSheet, directDependencies, impactType);
      const estimatedEffort = estimateEffort(affectedFactSheet, directDependencies, impactType);

      return {
        sourceId: selectedSource,
        affectedFactSheets: [affectedId],
        impactType,
        severity,
        description: generateImpactDescription(sourceFactSheet, affectedFactSheet, directDependencies, impactType),
        recommendations,
        estimatedCost,
        estimatedEffort
      };
    }).filter(Boolean) as ImpactAnalysisType[];

    return impacts.sort((a, b) => {
      const severityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }, [selectedSource, factSheets, dependencies, impactType]);

  const generateRecommendations = (
    factSheet: FactSheet, 
    dependencies: Dependency[], 
    impactType: string
  ): string[] => {
    const recommendations: string[] = [];

    if (factSheet.criticality === 'CRITICAL') {
      recommendations.push('Schedule maintenance window for critical system changes');
      recommendations.push('Implement comprehensive testing and rollback procedures');
    }

    if (dependencies.some(dep => dep.critical)) {
      recommendations.push('Review critical dependencies and prepare mitigation strategies');
    }

    if (impactType === 'MIGRATION') {
      recommendations.push('Create detailed migration plan with timeline and milestones');
      recommendations.push('Identify and test all integration points');
    }

    if (impactType === 'DEPRECATION') {
      recommendations.push('Plan data migration and user training');
      recommendations.push('Identify replacement systems and transition timeline');
    }

    if (factSheet.status === 'ACTIVE') {
      recommendations.push('Coordinate with business stakeholders for change approval');
    }

    return recommendations;
  };

  const generateImpactDescription = (
    source: FactSheet,
    affected: FactSheet,
    dependencies: Dependency[],
    impactType: string
  ): string => {
    const depTypes = dependencies.map(dep => dep.type.replace('_', ' ').toLowerCase()).join(', ');
    return `${impactType.toLowerCase()} of ${source.name} will impact ${affected.name} through ${depTypes} relationship${dependencies.length > 1 ? 's' : ''}.`;
  };

  const estimateCost = (factSheet: FactSheet, dependencies: Dependency[], impactType: string): number => {
    let baseCost = factSheet.cost || 0;
    let multiplier = 1;

    if (factSheet.criticality === 'CRITICAL') multiplier *= 2;
    if (dependencies.some(dep => dep.critical)) multiplier *= 1.5;
    if (impactType === 'MIGRATION') multiplier *= 1.8;
    if (impactType === 'DEPRECATION') multiplier *= 1.3;

    return Math.round(baseCost * multiplier * 0.1); // 10% of base cost as impact cost
  };

  const estimateEffort = (factSheet: FactSheet, dependencies: Dependency[], impactType: string): number => {
    let baseEffort = 1; // days
    let multiplier = 1;

    if (factSheet.criticality === 'CRITICAL') multiplier *= 2;
    if (dependencies.some(dep => dep.critical)) multiplier *= 1.5;
    if (impactType === 'MIGRATION') multiplier *= 3;
    if (impactType === 'DEPRECATION') multiplier *= 2;

    return Math.round(baseEffort * multiplier);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'HIGH': return <ErrorIcon />;
      case 'MEDIUM': return <WarningIcon />;
      case 'LOW': return <CheckCircleIcon />;
      default: return <InfoIcon />;
    }
  };

  const runAnalysis = () => {
    setLoading(true);
    // Simulate analysis delay
    setTimeout(() => {
      setAnalysisResults(calculateImpact);
      setLoading(false);
    }, 1000);
  };

  const totalAffectedSystems = analysisResults.reduce((sum, result) => sum + result.affectedFactSheets.length, 0);
  const highSeverityImpacts = analysisResults.filter(result => result.severity === 'HIGH').length;
  const totalEstimatedCost = analysisResults.reduce((sum, result) => sum + (result.estimatedCost || 0), 0);
  const totalEstimatedEffort = analysisResults.reduce((sum, result) => sum + (result.estimatedEffort || 0), 0);

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Impact Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Analyze the impact of changes on your enterprise architecture
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          variant="contained"
          onClick={runAnalysis}
          disabled={!selectedSource || loading}
        >
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </Button>
      </Box>

      {/* Analysis Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Analysis Configuration
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Source System</InputLabel>
                <Select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  label="Source System"
                >
                  {factSheets.map(fs => (
                    <MenuItem key={fs.id} value={fs.id}>{fs.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Impact Type</InputLabel>
                <Select
                  value={impactType}
                  onChange={(e) => setImpactType(e.target.value as any)}
                  label="Impact Type"
                >
                  <MenuItem value="CHANGE">Change</MenuItem>
                  <MenuItem value="DEPRECATION">Deprecation</MenuItem>
                  <MenuItem value="MIGRATION">Migration</MenuItem>
                  <MenuItem value="UPGRADE">Upgrade</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" height="100%">
                <Button
                  variant="contained"
                  onClick={runAnalysis}
                  disabled={!selectedSource || loading}
                  fullWidth
                >
                  {loading ? 'Analyzing...' : 'Run Analysis'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Analysis Results Summary */}
      {analysisResults.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <DependenciesIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{totalAffectedSystems}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Affected Systems
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <ErrorIcon color="error" />
                  <Box>
                    <Typography variant="h6">{highSeverityImpacts}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      High Severity
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <MoneyIcon color="success" />
                  <Box>
                    <Typography variant="h6">${totalEstimatedCost.toLocaleString()}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Estimated Cost
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <ScheduleIcon color="info" />
                  <Box>
                    <Typography variant="h6">{totalEstimatedEffort}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Days Effort
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Analysis Results */}
      {analysisResults.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Impact Analysis Results
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Affected System</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Estimated Cost</TableCell>
                    <TableCell>Estimated Effort</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analysisResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {result.affectedFactSheets.map(affectedId => {
                          const factSheet = factSheets.find(fs => fs.id === affectedId);
                          return (
                            <Chip
                              key={affectedId}
                              label={factSheet?.name || affectedId}
                              size="small"
                              onClick={() => onFactSheetSelect?.(affectedId)}
                              sx={{ mr: 1, mb: 1 }}
                            />
                          );
                        })}
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getSeverityIcon(result.severity)}
                          label={result.severity}
                          color={getSeverityColor(result.severity)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {result.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          ${result.estimatedCost?.toLocaleString() || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {result.estimatedEffort || '-'} days
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => {/* View details */}}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Detailed Recommendations */}
      {analysisResults.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recommendations
            </Typography>
            {analysisResults.map((result, index) => (
              <Accordion key={index}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      icon={getSeverityIcon(result.severity)}
                      label={result.severity}
                      color={getSeverityColor(result.severity)}
                      size="small"
                    />
                    <Typography variant="subtitle1">
                      {result.affectedFactSheets.map(affectedId => {
                        const factSheet = factSheets.find(fs => fs.id === affectedId);
                        return factSheet?.name || affectedId;
                      }).join(', ')}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" paragraph>
                    {result.description}
                  </Typography>
                  <Typography variant="subtitle2" gutterBottom>
                    Recommendations:
                  </Typography>
                  <List dense>
                    {result.recommendations.map((recommendation, recIndex) => (
                      <ListItem key={recIndex}>
                        <ListItemIcon>
                          <InfoIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={recommendation} />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {!loading && analysisResults.length === 0 && selectedSource && (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <AssessmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Impact Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No dependencies found for the selected system. This system appears to be isolated.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ImpactAnalysis;
e the leanix 