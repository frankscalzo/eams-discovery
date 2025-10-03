import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Upload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  CloudUpload as CloudUploadIcon,
  DataObject as DataObjectIcon
} from '@mui/icons-material';
import dataImporter from '../services/dataImporter';

const DataImporter = ({ onDataImported }) => {
  const [loading, setLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [csvData, setCsvData] = useState('');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setCsvData(e.target.result);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvData) {
      alert('Please select a CSV file first');
      return;
    }

    setLoading(true);
    setImportResults(null);

    try {
      const results = await dataImporter.importMasterAppsCSV(csvData);
      setImportResults(results);
      setOpenDialog(true);
      
      if (onDataImported) {
        onDataImported();
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportResults({
        error: error.message
      });
      setOpenDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleData = async () => {
    setLoading(true);
    setImportResults(null);

    try {
      const sampleData = dataImporter.getSampleData();
      const results = {};
      
      for (const entity of sampleData) {
        const savedEntity = await dataImporter.unifiedDataService.saveEntity(entity.entityType, entity);
        if (!results[entity.entityType]) {
          results[entity.entityType] = { success: true, count: 0, entities: [] };
        }
        results[entity.entityType].count++;
        results[entity.entityType].entities.push(savedEntity);
      }

      setImportResults(results);
      setOpenDialog(true);
      
      if (onDataImported) {
        onDataImported();
      }
    } catch (error) {
      console.error('Sample data error:', error);
      setImportResults({
        error: error.message
      });
      setOpenDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const getTotalImported = () => {
    if (!importResults) return 0;
    return Object.values(importResults).reduce((total, result) => {
      return total + (result.count || 0);
    }, 0);
  };

  const getSuccessCount = () => {
    if (!importResults) return 0;
    return Object.values(importResults).filter(result => result.success).length;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Data Importer
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Import real data from the Master Apps CSV file or load sample data to get started.
      </Typography>

      <Grid container spacing={3}>
        {/* CSV Import */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CloudUploadIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Import from CSV</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Upload the Master Apps CSV file to import real third-party applications and co-travelers.
              </Typography>

              <input
                accept=".csv"
                style={{ display: 'none' }}
                id="csv-file-input"
                type="file"
                onChange={handleFileUpload}
              />
              
              <Box mb={2}>
                <label htmlFor="csv-file-input">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadIcon />}
                    fullWidth
                  >
                    Select CSV File
                  </Button>
                </label>
              </Box>

              {csvData && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  CSV file loaded successfully!
                </Alert>
              )}

              <Button
                variant="contained"
                onClick={handleImport}
                disabled={!csvData || loading}
                fullWidth
                startIcon={<DataObjectIcon />}
              >
                {loading ? 'Importing...' : 'Import Data'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Sample Data */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <DataObjectIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Load Sample Data</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Load sample data to test the system with realistic examples.
              </Typography>

              <Button
                variant="contained"
                color="secondary"
                onClick={handleLoadSampleData}
                disabled={loading}
                fullWidth
                startIcon={<DataObjectIcon />}
              >
                {loading ? 'Loading...' : 'Load Sample Data'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading && (
        <Box sx={{ mt: 3 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Processing data...
          </Typography>
        </Box>
      )}

      {/* Import Results Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Import Results
        </DialogTitle>
        <DialogContent>
          {importResults?.error ? (
            <Alert severity="error">
              {importResults.error}
            </Alert>
          ) : (
            <Box>
              <Box display="flex" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ mr: 2 }}>
                  Import Summary
                </Typography>
                <Chip 
                  label={`${getTotalImported()} total items`} 
                  color="primary" 
                  variant="outlined"
                />
              </Box>

              <List>
                {Object.entries(importResults || {}).map(([entityType, result]) => (
                  <ListItem key={entityType}>
                    <ListItemIcon>
                      {result.success ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={`${entityType.replace('_', ' ').toUpperCase()}`}
                      secondary={
                        result.success 
                          ? `Successfully imported ${result.count} items`
                          : `Error: ${result.error}`
                      }
                    />
                    {result.success && (
                      <Chip 
                        label={result.count} 
                        color="success" 
                        size="small"
                      />
                    )}
                  </ListItem>
                ))}
              </List>

              {getSuccessCount() > 0 && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Data imported successfully! You can now view the imported data in the respective repositories.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataImporter;



