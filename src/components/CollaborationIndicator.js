import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Avatar,
  Tooltip,
  IconButton,
  Badge,
  Typography,
  Alert,
  Snackbar,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  People,
  Sync,
  Warning,
  CheckCircle,
  Error,
  Refresh,
  Visibility,
  Edit,
  Close
} from '@mui/icons-material';
import useCollaboration from '../hooks/useCollaboration';

const CollaborationIndicator = ({ 
  entityType, 
  entityId, 
  userId, 
  onConflict = () => {},
  onRollback = () => {},
  onUpdate = () => {}
}) => {
  const {
    isConnected,
    isLoading,
    error,
    collaborationStatus,
    pendingChanges,
    lastSync,
    hasPendingChanges,
    hasErrors,
    isOnline,
    reconnect,
    clearPendingChanges
  } = useCollaboration(entityType, entityId, userId);

  const [showDetails, setShowDetails] = useState(false);
  const [conflictDialog, setConflictDialog] = useState(null);
  const [rollbackDialog, setRollbackDialog] = useState(null);

  // Listen for collaboration events
  useEffect(() => {
    const handleEntityUpdate = (event) => {
      onUpdate(event.detail);
    };

    const handleConflict = (event) => {
      setConflictDialog(event.detail);
      onConflict(event.detail);
    };

    const handleRollback = (event) => {
      setRollbackDialog(event.detail);
      onRollback(event.detail);
    };

    window.addEventListener('entityUpdated', handleEntityUpdate);
    window.addEventListener('conflictDetected', handleConflict);
    window.addEventListener('rollbackRequired', handleRollback);

    return () => {
      window.removeEventListener('entityUpdated', handleEntityUpdate);
      window.removeEventListener('conflictDetected', handleConflict);
      window.removeEventListener('rollbackRequired', handleRollback);
    };
  }, [onUpdate, onConflict, onRollback]);

  const getConnectionStatus = () => {
    if (isLoading) return { color: 'default', label: 'Connecting...', icon: <Sync /> };
    if (error) return { color: 'error', label: 'Disconnected', icon: <Error /> };
    if (isConnected) return { color: 'success', label: 'Connected', icon: <CheckCircle /> };
    return { color: 'default', label: 'Offline', icon: <Warning /> };
  };

  const getPendingChangesStatus = () => {
    if (hasErrors) return { color: 'error', count: pendingChanges.filter(c => c.status === 'failed').length };
    if (hasPendingChanges) return { color: 'warning', count: pendingChanges.filter(c => c.status === 'pending').length };
    return { color: 'success', count: 0 };
  };

  const status = getConnectionStatus();
  const pendingStatus = getPendingChangesStatus();

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Connection Status */}
        <Tooltip title={`${status.label}${error ? `: ${error}` : ''}`}>
          <Chip
            icon={status.icon}
            label={status.label}
            color={status.color}
            size="small"
            variant={isConnected ? 'filled' : 'outlined'}
          />
        </Tooltip>

        {/* Active Users */}
        {collaborationStatus?.activeUsers && collaborationStatus.activeUsers.length > 0 && (
          <Tooltip title={`${collaborationStatus.activeUsers.length} active user(s)`}>
            <Badge badgeContent={collaborationStatus.activeUsers.length} color="primary">
              <Chip
                icon={<People />}
                label="Active"
                color="primary"
                size="small"
                variant="outlined"
                onClick={() => setShowDetails(true)}
              />
            </Badge>
          </Tooltip>
        )}

        {/* Pending Changes */}
        {hasPendingChanges && (
          <Tooltip title={`${pendingStatus.count} pending change(s)`}>
            <Badge badgeContent={pendingStatus.count} color={pendingStatus.color}>
              <Chip
                icon={<Sync />}
                label="Pending"
                color={pendingStatus.color}
                size="small"
                variant="outlined"
              />
            </Badge>
          </Tooltip>
        )}

        {/* Last Sync */}
        {lastSync && (
          <Tooltip title={`Last sync: ${new Date(lastSync).toLocaleString()}`}>
            <Chip
              icon={<Visibility />}
              label={new Date(lastSync).toLocaleTimeString()}
              size="small"
              variant="outlined"
            />
          </Tooltip>
        )}

        {/* Reconnect Button */}
        {!isConnected && !isLoading && (
          <Tooltip title="Reconnect">
            <IconButton size="small" onClick={reconnect}>
              <Refresh />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Loading Indicator */}
      {isLoading && (
        <LinearProgress 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            height: 2 
          }} 
        />
      )}

      {/* Collaboration Details Dialog */}
      <Dialog 
        open={showDetails} 
        onClose={() => setShowDetails(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Collaboration Status
          <IconButton
            onClick={() => setShowDetails(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {/* Active Users */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Active Users ({collaborationStatus?.activeUsers?.length || 0})
            </Typography>
            <List dense>
              {collaborationStatus?.activeUsers?.map((user, index) => (
                <ListItem key={index}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {user.userId?.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.userId}
                    secondary={`Connected: ${new Date(user.connectedAt).toLocaleString()}`}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      icon={<Edit />}
                      label="Editing"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Recent Activity */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List dense>
              {collaborationStatus?.recentEvents?.slice(0, 5).map((event, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={event.EventType}
                    secondary={`${event.UserId} - ${new Date(event.Timestamp).toLocaleString()}`}
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Pending Changes */}
          {hasPendingChanges && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Pending Changes ({pendingChanges.length})
              </Typography>
              <List dense>
                {pendingChanges.map((change, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={change.status}
                      secondary={`${new Date(change.timestamp).toLocaleString()}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={change.status}
                        size="small"
                        color={change.status === 'failed' ? 'error' : 'warning'}
                        variant="outlined"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={clearPendingChanges} disabled={!hasPendingChanges}>
            Clear Pending
          </Button>
          <Button onClick={() => setShowDetails(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <Dialog 
        open={!!conflictDialog} 
        onClose={() => setConflictDialog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Conflict Detected</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Another user has made changes to this item while you were editing.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Please review the changes and decide how to resolve the conflict.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConflictDialog(null)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => setConflictDialog(null)}>
            Resolve Conflict
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rollback Dialog */}
      <Dialog 
        open={!!rollbackDialog} 
        onClose={() => setRollbackDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Changes Rolled Back</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Your changes have been rolled back due to a conflict.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Please refresh the page to see the latest changes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackDialog(null)}>
            Close
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setRollbackDialog(null);
              window.location.reload();
            }}
          >
            Refresh Page
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CollaborationIndicator;
