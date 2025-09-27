import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
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
  Checkbox,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'array';
  required: boolean;
  transform?: (value: any) => any;
}

interface ExcelDataImporterProps {
  onDataImport?: (data: any[]) => void;
  onClose?: () => void;
  open: boolean;
  targetSchema: any; // The EAMS data schema
}

const ExcelDataImporter: React.FC<ExcelDataImporterProps> = ({
  onDataImport,
  onClose,
  open,
  targetSchema
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [rawData, setRawData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [mappedData, setMappedData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setActiveStep(0);
      setRawData([]);
      setColumns([]);
      setColumnMappings([]);
      setMappedData([]);
      setErrors([]);
      setPreviewData([]);
    }
  }, [open]);

  // Handle file upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let parsedData: any[] = [];
        let headers: string[] = [];

        if (file.name.endsWith('.csv')) {
          const result = Papa.parse(data as string, { header: true, skipEmptyLines: true });
          parsedData = result.data as any[];
          headers = result.meta.fields || [];
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          headers = jsonData[0] as string[];
          parsedData = jsonData.slice(1).map((row: any[]) => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index];
            });
            return obj;
          });
        }

        setRawData(parsedData);
        setColumns(headers);
        setActiveStep(1);
      } catch (error) {
        setErrors([`Error parsing file: ${error}`]);
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
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

  // Auto-generate column mappings based on target schema
  const generateColumnMappings = () => {
    const mappings: ColumnMapping[] = columns.map(column => {
      // Try to find a matching field in the target schema
      const targetField = findBestMatch(column, targetSchema);
      return {
        sourceColumn: column,
        targetField: targetField || column,
        dataType: inferDataType(column, rawData),
        required: false,
        transform: undefined
      };
    });
    setColumnMappings(mappings);
    setActiveStep(2);
  };

  // Find the best matching field in the target schema
  const findBestMatch = (sourceColumn: string, schema: any): string => {
    const sourceLower = sourceColumn.toLowerCase();
    const schemaFields = Object.keys(schema);
    
    // Exact match
    let match = schemaFields.find(field => field.toLowerCase() === sourceLower);
    if (match) return match;

    // Partial match
    match = schemaFields.find(field => 
      field.toLowerCase().includes(sourceLower) || 
      sourceLower.includes(field.toLowerCase())
    );
    if (match) return match;

    // Common field mappings
    const commonMappings: Record<string, string> = {
      'name': 'name',
      'title': 'name',
      'description': 'description',
      'desc': 'description',
      'type': 'type',
      'status': 'status',
      'owner': 'owner',
      'cost': 'cost',
      'price': 'cost',
      'tags': 'tags',
      'created': 'createdAt',
      'updated': 'updatedAt',
      'modified': 'updatedAt'
    };

    return commonMappings[sourceLower] || sourceColumn;
  };

  // Infer data type from column data
  const inferDataType = (column: string, data: any[]): 'string' | 'number' | 'date' | 'boolean' | 'array' => {
    const sampleValues = data.slice(0, 10).map(row => row[column]).filter(val => val !== null && val !== undefined);
    
    if (sampleValues.length === 0) return 'string';

    // Check for boolean
    if (sampleValues.every(val => ['true', 'false', 'yes', 'no', '1', '0'].includes(String(val).toLowerCase()))) {
      return 'boolean';
    }

    // Check for date
    if (sampleValues.every(val => !isNaN(Date.parse(val)))) {
      return 'date';
    }

    // Check for number
    if (sampleValues.every(val => !isNaN(Number(val)))) {
      return 'number';
    }

    // Check for array (comma-separated values)
    if (sampleValues.some(val => String(val).includes(','))) {
      return 'array';
    }

    return 'string';
  };

  // Update column mapping
  const updateColumnMapping = (index: number, field: keyof ColumnMapping, value: any) => {
    const newMappings = [...columnMappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setColumnMappings(newMappings);
  };

  // Transform data based on mappings
  const transformData = () => {
    const transformed = rawData.map(row => {
      const newRow: any = {};
      columnMappings.forEach(mapping => {
        const value = row[mapping.sourceColumn];
        let transformedValue = value;

        // Apply data type transformation
        switch (mapping.dataType) {
          case 'number':
            transformedValue = Number(value) || 0;
            break;
          case 'boolean':
            transformedValue = ['true', 'yes', '1'].includes(String(value).toLowerCase());
            break;
          case 'date':
            transformedValue = new Date(value).toISOString();
            break;
          case 'array':
            transformedValue = String(value).split(',').map((item: string) => item.trim());
            break;
          default:
            transformedValue = String(value);
        }

        // Apply custom transform if provided
        if (mapping.transform) {
          transformedValue = mapping.transform(transformedValue);
        }

        newRow[mapping.targetField] = transformedValue;
      });
      return newRow;
    });

    setMappedData(transformed);
    setPreviewData(transformed.slice(0, 10)); // Show first 10 rows
    setActiveStep(3);
  };

  // Validate mapped data
  const validateData = () => {
    const validationErrors: string[] = [];
    
    columnMappings.forEach(mapping => {
      if (mapping.required) {
        const emptyRows = mappedData.filter(row => 
          !row[mapping.targetField] || row[mapping.targetField] === ''
        );
        if (emptyRows.length > 0) {
          validationErrors.push(`Required field '${mapping.targetField}' is empty in ${emptyRows.length} rows`);
        }
      }
    });

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  // Import data
  const handleImport = () => {
    if (validateData()) {
      onDataImport?.(mappedData);
      onClose?.();
    }
  };

  // Download template
  const downloadTemplate = () => {
    const templateData = [Object.keys(targetSchema)];
    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eams-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const steps = [
    'Upload File',
    'Map Columns',
    'Transform Data',
    'Preview & Import'
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Import Data from Excel/CSV</Typography>
          <Box>
            <Button
              startIcon={<DownloadIcon />}
              onClick={downloadTemplate}
              size="small"
              sx={{ mr: 1 }}
            >
              Download Template
            </Button>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} orientation="vertical">
          {/* Step 1: Upload File */}
          <Step>
            <StepLabel>Upload File</StepLabel>
            <StepContent>
              <Box
                {...getRootProps()}
                sx={{
                  border: '2px dashed #ccc',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <input {...getInputProps()} />
                <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  or click to select a file
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Supports CSV, XLS, and XLSX formats
                </Typography>
              </Box>
              
              {rawData.length > 0 && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Successfully loaded {rawData.length} rows with {columns.length} columns
                </Alert>
              )}
            </StepContent>
          </Step>

          {/* Step 2: Map Columns */}
          <Step>
            <StepLabel>Map Columns</StepLabel>
            <StepContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1">
                  Map your columns to EAMS fields
                </Typography>
                <Button
                  variant="outlined"
                  onClick={generateColumnMappings}
                  startIcon={<RefreshIcon />}
                >
                  Auto-Map
                </Button>
              </Box>

              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Source Column</TableCell>
                      <TableCell>Target Field</TableCell>
                      <TableCell>Data Type</TableCell>
                      <TableCell>Required</TableCell>
                      <TableCell>Sample Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {columns.map((column, index) => (
                      <TableRow key={column}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {column}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={columnMappings[index]?.targetField || column}
                              onChange={(e) => updateColumnMapping(index, 'targetField', e.target.value)}
                            >
                              {Object.keys(targetSchema).map(field => (
                                <MenuItem key={field} value={field}>{field}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={columnMappings[index]?.dataType || 'string'}
                              onChange={(e) => updateColumnMapping(index, 'dataType', e.target.value)}
                            >
                              <MenuItem value="string">String</MenuItem>
                              <MenuItem value="number">Number</MenuItem>
                              <MenuItem value="date">Date</MenuItem>
                              <MenuItem value="boolean">Boolean</MenuItem>
                              <MenuItem value="array">Array</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={columnMappings[index]?.required || false}
                            onChange={(e) => updateColumnMapping(index, 'required', e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" noWrap sx={{ maxWidth: 200 }}>
                            {rawData[0]?.[column] || '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box mt={2}>
                <Button
                  variant="contained"
                  onClick={transformData}
                  disabled={columnMappings.length === 0}
                >
                  Transform Data
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Step 3: Preview Data */}
          <Step>
            <StepLabel>Preview & Import</StepLabel>
            <StepContent>
              <Typography variant="subtitle1" gutterBottom>
                Preview of transformed data ({mappedData.length} rows)
              </Typography>

              {errors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Validation Errors:</Typography>
                  <ul>
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      {Object.keys(mappedData[0] || {}).map(field => (
                        <TableCell key={field}>{field}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData.map((row, index) => (
                      <TableRow key={index}>
                        {Object.values(row).map((value, cellIndex) => (
                          <TableCell key={cellIndex}>
                            {Array.isArray(value) ? (
                              <Box display="flex" gap={0.5} flexWrap="wrap">
                                {value.map((item, i) => (
                                  <Chip key={i} label={item} size="small" />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" noWrap>
                                {String(value)}
                              </Typography>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box mt={2} display="flex" gap={2}>
                <Button
                  variant="contained"
                  onClick={handleImport}
                  disabled={errors.length > 0}
                  startIcon={<CheckIcon />}
                >
                  Import {mappedData.length} Records
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setActiveStep(1)}
                >
                  Back to Mapping
                </Button>
              </Box>
            </StepContent>
          </Step>
        </Stepper>
      </DialogContent>
    </Dialog>
  );
};

export default ExcelDataImporter;
