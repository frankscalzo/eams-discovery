import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
  Alert,
  Grid,
  Paper,
  Divider
} from '@mui/material';
import {
  CloudUpload,
  AttachFile,
  Delete,
  Download,
  Visibility,
  Description,
  Notifications,
  CheckCircle,
  Error
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import fileUploadAPI from '../services/fileUploadAPI';
import confluenceAPI from '../services/confluenceAPI';
import teamsAPI from '../services/teamsAPI';
import { useProject } from '../contexts/ProjectContext';

const FileUploadManager = ({ application, onFileUploaded }) => {
  const { currentProject } = useProject();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confluencePage, setConfluencePage] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Load existing files
  useEffect(() => {
    loadFiles();
    checkConfluencePage();
  }, [application]);

  const loadFiles = async () => {
    try {
      const companyId = currentProject?.companyId || 'default';
      const applicationId = application?.ApplicationID;
      
      if (companyId && applicationId) {
        const fileList = await fileUploadAPI.listApplicationFiles(companyId, applicationId);
        setFiles(fileList);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const checkConfluencePage = async () => {
    try {
      if (application?.ApplicationID) {
        // Check if Confluence page exists for this application
        const searchResults = await confluenceAPI.searchPages(application.ApplicationName);
        const existingPage = searchResults.find(page => 
          page.title.includes(application.ApplicationName)
        );
        setConfluencePage(existingPage || null);
      }
    } catch (error) {
      console.error('Error checking Confluence page:', error);
    }
  };

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    const companyId = currentProject?.companyId || 'default';
    const applicationId = application?.ApplicationID;

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      
      try {
        const result = await fileUploadAPI.uploadFile(file, companyId, applicationId, {
          uploadedBy: 'current-user', // This should come from auth context
          uploadedAt: new Date().toISOString()
        });

        if (result.success) {
          // Send Teams notification
          await teamsAPI.notifyFileUploaded(
            companyId,
            application,
            currentProject?.id,
            file.name,
            file.size
          );

          // Add to notifications
          setNotifications(prev => [...prev, {
            id: Date.now(),
            type: 'success',
            message: `File "${file.name}" uploaded successfully`,
            timestamp: new Date()
          }]);

          // Reload files
          await loadFiles();
          
          // Notify parent component
          if (onFileUploaded) {
            onFileUploaded(result);
          }
        } else {
          throw new Error(result.error);
        }

        setUploadProgress(((i + 1) / acceptedFiles.length) * 100);
      } catch (error) {
        console.error('Error uploading file:', error);
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'error',
          message: `Failed to upload "${file.name}": ${error.message}`,
          timestamp: new Date()
        }]);
      }
    }

    setUploading(false);
    setUploadProgress(0);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/zip': ['.zip']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true
  });

  const handleDeleteFile = async (file) => {
    try {
      const result = await fileUploadAPI.deleteFile(file.key, file.bucket);
      if (result.success) {
        await loadFiles();
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'success',
          message: `File "${file.name}" deleted successfully`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `Failed to delete "${file.name}": ${error.message}`,
        timestamp: new Date()
      }]);
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      const signedUrl = await fileUploadAPI.getSignedDownloadUrl(file.key, file.bucket);
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleCreateConfluencePage = async () => {
    try {
      const companyId = currentProject?.companyId || 'default';
      const result = await confluenceAPI.createApplicationPage(application, currentProject?.id);
      
      setConfluencePage(result);
      
      // Send Teams notification
      await teamsAPI.notifyConfluencePageCreated(
        companyId,
        application,
        currentProject?.id,
        result.url
      );

      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'success',
        message: 'Confluence page created successfully',
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error creating Confluence page:', error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `Failed to create Confluence page: ${error.message}`,
        timestamp: new Date()
      }]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const iconMap = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      xls: '📊',
      xlsx: '📊',
      txt: '📄',
      png: '🖼️',
      jpg: '🖼️',
      jpeg: '🖼️',
      gif: '🖼️',
      zip: '📦'
    };
    return iconMap[extension] || '📄';
  };

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

      <Grid container spacing={3}>
        {/* File Upload Area */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AttachFile sx={{ mr: 1, verticalAlign: 'middle' }} />
                File Attachments
              </Typography>
              
              <Paper
                {...getRootProps()}
                sx={{
                  p: 3,
                  textAlign: 'center',
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.300',
                  backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
                  cursor: 'pointer',
                  mb: 2
                }}
              >
                <input {...getInputProps()} />
                <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  or click to select files (max 50MB each)
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Supported: PDF, DOC, XLS, TXT, Images, ZIP
                </Typography>
              </Paper>

              {uploading && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Uploading files...
                  </Typography>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Confluence Integration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Description sx={{ mr: 1, verticalAlign: 'middle' }} />
                Documentation
              </Typography>
              
              {confluencePage ? (
                <Box>
                  <Typography variant="body1" gutterBottom>
                    Confluence page exists for this application
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Visibility />}
                    href={confluencePage.url}
                    target="_blank"
                    sx={{ mr: 1 }}
                  >
                    View Page
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Description />}
                    onClick={() => {
                      confluenceAPI.updateApplicationPage(confluencePage.id, application, currentProject?.id);
                    }}
                  >
                    Update Page
                  </Button>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body1" gutterBottom>
                    No Confluence page exists for this application
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Description />}
                    onClick={handleCreateConfluencePage}
                  >
                    Create Documentation Page
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* File List */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Attached Files ({files.length})
              </Typography>
              
              {files.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No files attached to this application
                </Typography>
              ) : (
                <List>
                  {files.map((file, index) => (
                    <React.Fragment key={file.key}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body1" sx={{ mr: 1 }}>
                                {getFileIcon(file.name)}
                              </Typography>
                              <Typography variant="body1">
                                {file.name}
                              </Typography>
                              <Chip
                                label={formatFileSize(file.size)}
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              Uploaded: {new Date(file.lastModified).toLocaleDateString()}
                            </Typography>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleDownloadFile(file)}
                            sx={{ mr: 1 }}
                          >
                            <Download />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => {
                              setSelectedFile(file);
                              setPreviewOpen(true);
                            }}
                            sx={{ mr: 1 }}
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => handleDeleteFile(file)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < files.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* File Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          File Preview: {selectedFile?.name}
        </DialogTitle>
        <DialogContent>
          {selectedFile && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h4" gutterBottom>
                {getFileIcon(selectedFile.name)}
              </Typography>
              <Typography variant="h6" gutterBottom>
                {selectedFile.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Size: {formatFileSize(selectedFile.size)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Uploaded: {new Date(selectedFile.lastModified).toLocaleString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => {
              if (selectedFile) {
                handleDownloadFile(selectedFile);
                setPreviewOpen(false);
              }
            }}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FileUploadManager;
