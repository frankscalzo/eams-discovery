import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { aiAPI, bulkUploadAPI } from '../services/multiProjectAPI';

const BulkUploader = ({ projectId, onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [fieldMapping, setFieldMapping] = useState({});
  const [cleanedData, setCleanedData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);

  const steps = [
    'Upload File',
    'Field Mapping',
    'Data Validation',
    'Upload to Database'
  ];

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setActiveStep(1);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  const processFile = async () => {
    if (!file || !projectId) return;

    setProcessing(true);
    try {
      const result = await aiAPI.processFile(file, projectId);
      setFieldMapping(result.fieldMapping);
      setCleanedData(result.cleanedData);
      setValidationErrors(
        result.cleanedData
          .filter(item => item._validationErrors)
          .map((item, index) => ({
            row: index + 1,
            errors: item._validationErrors
          }))
      );
      setActiveStep(2);
    } catch (error) {
      console.error('Error processing file:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleFieldMappingChange = (field, column) => {
    setFieldMapping(prev => ({
      ...prev,
      [field]: column
    }));
  };

  const uploadData = async () => {
    if (!cleanedData.length || !projectId) return;

    setUploading(true);
    try {
      const result = await bulkUploadAPI.processBulkUpload(projectId, cleanedData, fieldMapping);
      setUploadResults(result);
      setActiveStep(3);
    } catch (error) {
      console.error('Error uploading data:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && file) {
      processFile();
    } else if (activeStep === 1) {
      setActiveStep(2);
    } else if (activeStep === 2) {
      uploadData();
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleReset = () => {
    setFile(null);
    setFieldMapping({});
    setCleanedData([]);
    setValidationErrors([]);
    setUploadResults(null);
    setActiveStep(0);
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Paper
              {...getRootProps()}
              sx={{
                p: 4,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover'
                }
              }}
            >
              <input {...getInputProps()} />
              <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                or click to select a file
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supports CSV, XLS, XLSX files
              </Typography>
            </Paper>
            {file && (
              <Box mt={2}>
                <Alert severity="success">
                  File selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </Alert>
              </Box>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Field Mapping
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Map the columns from your file to the application fields. AI has suggested some mappings, but you can adjust them.
            </Typography>
            
            {Object.keys(cleanedData[0] || {}).map(column => (
              <FormControl key={column} fullWidth sx={{ mb: 2 }}>
                <InputLabel>Column: {column}</InputLabel>
                <Select
                  value={fieldMapping[column] || ''}
                  onChange={(e) => handleFieldMappingChange(column, e.target.value)}
                  label={`Column: ${column}`}
                >
                  <MenuItem value="">Skip this column</MenuItem>
                  <MenuItem value="ApplicationName">Application Name</MenuItem>
                  <MenuItem value="Teams">Teams</MenuItem>
                  <MenuItem value="Owner">Owner</MenuItem>
                  <MenuItem value="Manager">Manager</MenuItem>
                  <MenuItem value="EpicSLG">Epic SLG/CHG/Ticket#</MenuItem>
                  <MenuItem value="TestPlanReady">Test Plan Ready</MenuItem>
                  <MenuItem value="TestingStatus">Testing Status</MenuItem>
                  <MenuItem value="Confidence">Confidence %</MenuItem>
                  <MenuItem value="TestingNotes">Testing Notes</MenuItem>
                  <MenuItem value="ApplicationDescription">Application Description</MenuItem>
                  <MenuItem value="IntegrationType">Integration Type</MenuItem>
                  <MenuItem value="IntegrationDetails">Integration Details</MenuItem>
                  <MenuItem value="ROI">ROI</MenuItem>
                  <MenuItem value="RTO">RTO</MenuItem>
                  <MenuItem value="RPO">RPO</MenuItem>
                </Select>
              </FormControl>
            ))}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Data Validation
            </Typography>
            
            {validationErrors.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Found {validationErrors.length} rows with validation errors. Please review before uploading.
              </Alert>
            )}

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Application Name</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Errors</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cleanedData.slice(0, 10).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.ApplicationName || 'N/A'}</TableCell>
                      <TableCell>
                        {item.Owner?.fullName || item.Owner || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {item._validationErrors ? (
                          <Chip
                            icon={<ErrorIcon />}
                            label="Errors"
                            color="error"
                            size="small"
                          />
                        ) : (
                          <Chip
                            icon={<CheckIcon />}
                            label="Valid"
                            color="success"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {item._validationErrors?.join(', ') || 'None'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {cleanedData.length > 10 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Showing first 10 rows of {cleanedData.length} total rows
              </Typography>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Upload Complete
            </Typography>
            
            {uploadResults ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                Successfully uploaded {uploadResults.processed} applications in {uploadResults.batches} batches.
              </Alert>
            ) : (
              <Alert severity="error" sx={{ mb: 2 }}>
                Upload failed. Please try again.
              </Alert>
            )}

            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={onSuccess}
                startIcon={<CheckIcon />}
              >
                View Applications
              </Button>
              <Button
                variant="outlined"
                onClick={handleReset}
              >
                Upload Another File
              </Button>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
            <StepContent>
              {getStepContent(index)}
              <Box sx={{ mb: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={
                    (activeStep === 0 && !file) ||
                    (activeStep === 1 && Object.keys(fieldMapping).length === 0) ||
                    processing ||
                    uploading
                  }
                  sx={{ mr: 1 }}
                >
                  {processing || uploading ? (
                    <>
                      <LinearProgress sx={{ width: 20, mr: 1 }} />
                      {processing ? 'Processing...' : 'Uploading...'}
                    </>
                  ) : activeStep === steps.length - 1 ? (
                    'Complete'
                  ) : (
                    'Next'
                  )}
                </Button>
                {activeStep > 0 && (
                  <Button onClick={handleBack} sx={{ mr: 1 }}>
                    Back
                  </Button>
                )}
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default BulkUploader;
