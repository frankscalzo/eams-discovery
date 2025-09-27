import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Box,
  Typography,
  Divider
} from '@mui/material';
import {
  ContentCopy as CloneIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

const CloneDialog = ({ 
  open, 
  onClose, 
  onClone, 
  originalItem, 
  itemType = 'Application',
  projects = [] 
}) => {
  const [cloneData, setCloneData] = useState({
    name: '',
    projectId: '',
    copyData: true,
    copyDependencies: false,
    copyAttachments: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (open && originalItem) {
      setCloneData({
        name: `${originalItem.ApplicationName || originalItem.name || 'Item'} (Copy)`,
        projectId: originalItem.projectId || '',
        copyData: true,
        copyDependencies: false,
        copyAttachments: false
      });
    }
  }, [open, originalItem]);

  const handleInputChange = (field, value) => {
    setCloneData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClone = async () => {
    if (!cloneData.name.trim()) {
      setError('Please enter a name for the cloned item');
      return;
    }

    if (!cloneData.projectId) {
      setError('Please select a project');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onClone({
        ...cloneData,
        originalItem,
        itemType
      });
      onClose();
    } catch (err) {
      setError('Failed to clone item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCloneData({
      name: '',
      projectId: '',
      copyData: true,
      copyDependencies: false,
      copyAttachments: false
    });
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <CloneIcon sx={{ mr: 1, color: 'primary.main' }} />
          Clone {itemType}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          Create a copy of "{originalItem?.ApplicationName || originalItem?.name || 'this item'}" 
          with the settings below.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            fullWidth
            label={`${itemType} Name`}
            value={cloneData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
            helperText="Enter a unique name for the cloned item"
          />

          <FormControl fullWidth required>
            <InputLabel>Target Project</InputLabel>
            <Select
              value={cloneData.projectId}
              onChange={(e) => handleInputChange('projectId', e.target.value)}
            >
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ my: 1 }} />

          <Typography variant="subtitle2" gutterBottom>
            Clone Options
          </Typography>

          <FormControl fullWidth>
            <InputLabel>Copy Data</InputLabel>
            <Select
              value={cloneData.copyData}
              onChange={(e) => handleInputChange('copyData', e.target.value)}
            >
              <MenuItem value={true}>Yes - Copy all data</MenuItem>
              <MenuItem value={false}>No - Create empty template</MenuItem>
            </Select>
          </FormControl>

          {itemType === 'Application' && (
            <>
              <FormControl fullWidth>
                <InputLabel>Copy Dependencies</InputLabel>
                <Select
                  value={cloneData.copyDependencies}
                  onChange={(e) => handleInputChange('copyDependencies', e.target.value)}
                >
                  <MenuItem value={true}>Yes - Copy all dependencies</MenuItem>
                  <MenuItem value={false}>No - Start with no dependencies</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Copy Attachments</InputLabel>
                <Select
                  value={cloneData.copyAttachments}
                  onChange={(e) => handleInputChange('copyAttachments', e.target.value)}
                >
                  <MenuItem value={true}>Yes - Copy all attachments</MenuItem>
                  <MenuItem value={false}>No - Start with no attachments</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          startIcon={<CancelIcon />}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleClone}
          variant="contained"
          startIcon={loading ? <div /> : <SaveIcon />}
          disabled={loading}
        >
          {loading ? 'Cloning...' : 'Clone Item'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CloneDialog;
