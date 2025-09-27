import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  Grid,
  Paper,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add,
  Settings,
  Notifications,
  NotificationsOff,
  Group,
  Link,
  CheckCircle,
  Error,
  Refresh
} from '@mui/icons-material';
import teamsAPI from '../services/teamsAPI';
import { useProject } from '../contexts/ProjectContext';

const TeamsChannelManager = ({ project, onChannelCreated }) => {
  const { currentProject } = useProject();
  const [channels, setChannels] = useState([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [channelSettings, setChannelSettings] = useState({
    webhookUrl: '',
    notificationsEnabled: true,
    channelName: `EAMS-${project?.id || 'project'}`,
    description: `EAMS notifications for project ${project?.id || 'project'}`
  });

  useEffect(() => {
    loadChannels();
  }, [project]);

  const loadChannels = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from your backend
      // For now, we'll simulate with local storage or mock data
      const savedChannels = JSON.parse(localStorage.getItem(`teams-channels-${project?.id}`) || '[]');
      setChannels(savedChannels);
    } catch (error) {
      console.error('Error loading channels:', error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: 'Failed to load Teams channels',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    try {
      setLoading(true);
      const companyId = currentProject?.companyId || 'default';
      
      const result = await teamsAPI.createProjectChannel(
        companyId,
        project.id,
        channelSettings.channelName
      );

      if (result.success) {
        const newChannel = {
          id: result.channelId,
          name: result.channelName,
          webhookUrl: channelSettings.webhookUrl,
          notificationsEnabled: channelSettings.notificationsEnabled,
          createdAt: new Date().toISOString(),
          status: 'active'
        };

        const updatedChannels = [...channels, newChannel];
        setChannels(updatedChannels);
        localStorage.setItem(`teams-channels-${project.id}`, JSON.stringify(updatedChannels));

        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'success',
          message: `Teams channel "${newChannel.name}" created successfully`,
          timestamp: new Date()
        }]);

        setCreateDialogOpen(false);
        
        if (onChannelCreated) {
          onChannelCreated(newChannel);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error creating Teams channel:', error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `Failed to create Teams channel: ${error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChannel = async (channelId, updates) => {
    try {
      const updatedChannels = channels.map(channel => 
        channel.id === channelId ? { ...channel, ...updates } : channel
      );
      
      setChannels(updatedChannels);
      localStorage.setItem(`teams-channels-${project.id}`, JSON.stringify(updatedChannels));

      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'success',
        message: 'Channel settings updated successfully',
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error updating channel:', error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `Failed to update channel: ${error.message}`,
        timestamp: new Date()
      }]);
    }
  };

  const handleTestWebhook = async (channel) => {
    try {
      const companyId = currentProject?.companyId || 'default';
      
      const result = await teamsAPI.sendNotification(
        companyId,
        {
          title: 'Test Notification',
          description: 'This is a test message to verify your Teams webhook is working correctly.',
          actions: [{
            type: 'Action.OpenUrl',
            title: 'View Project',
            url: `${window.location.origin}/projects/${project.id}/dashboard`
          }]
        },
        'info',
        project.id
      );

      if (result.success) {
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'success',
          message: 'Test notification sent successfully!',
          timestamp: new Date()
        }];
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `Failed to send test notification: ${error.message}`,
        timestamp: new Date()
      }]);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'error': return 'error';
      default: return 'default';
    }
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
        {/* Channel Management */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  <Group sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Teams Channels
                </Typography>
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={loadChannels}
                    disabled={loading}
                    sx={{ mr: 1 }}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    Add Channel
                  </Button>
                </Box>
              </Box>

              {channels.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    No Teams channels configured for this project
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create a channel to receive EAMS notifications in Microsoft Teams
                  </Typography>
                </Paper>
              ) : (
                <List>
                  {channels.map((channel, index) => (
                    <React.Fragment key={channel.id}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body1" sx={{ mr: 1 }}>
                                {channel.name}
                              </Typography>
                              <Chip
                                label={channel.status}
                                size="small"
                                color={getStatusColor(channel.status)}
                                sx={{ mr: 1 }}
                              />
                              {channel.notificationsEnabled && (
                                <Chip
                                  icon={<Notifications />}
                                  label="Notifications On"
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Created: {new Date(channel.createdAt).toLocaleDateString()}
                              </Typography>
                              {channel.webhookUrl && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Webhook: {channel.webhookUrl.substring(0, 50)}...
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleTestWebhook(channel)}
                            sx={{ mr: 1 }}
                          >
                            <Link />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => {
                              setChannelSettings({
                                ...channelSettings,
                                webhookUrl: channel.webhookUrl || '',
                                notificationsEnabled: channel.notificationsEnabled,
                                channelName: channel.name
                              });
                              setSettingsDialogOpen(true);
                            }}
                          >
                            <Settings />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < channels.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Notifications />}
                  onClick={() => {
                    // Send a test notification to all channels
                    channels.forEach(channel => {
                      if (channel.notificationsEnabled) {
                        handleTestWebhook(channel);
                      }
                    });
                  }}
                  disabled={channels.length === 0}
                >
                  Test All Channels
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Group />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create New Channel
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Channel Benefits:
              </Typography>
              <Typography variant="body2" color="text.secondary" component="div">
                • Real-time application updates<br/>
                • File upload notifications<br/>
                • Testing status changes<br/>
                • Dependency alerts<br/>
                • Project milestones<br/>
                • Confluence page updates
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Channel Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Teams Channel</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Channel Name"
            fullWidth
            variant="outlined"
            value={channelSettings.channelName}
            onChange={(e) => setChannelSettings(prev => ({
              ...prev,
              channelName: e.target.value
            }))}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Webhook URL"
            fullWidth
            variant="outlined"
            value={channelSettings.webhookUrl}
            onChange={(e) => setChannelSettings(prev => ({
              ...prev,
              webhookUrl: e.target.value
            }))}
            placeholder="https://your-org.webhook.office.com/webhookb2/..."
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={channelSettings.description}
            onChange={(e) => setChannelSettings(prev => ({
              ...prev,
              description: e.target.value
            }))}
            sx={{ mb: 2 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={channelSettings.notificationsEnabled}
                onChange={(e) => setChannelSettings(prev => ({
                  ...prev,
                  notificationsEnabled: e.target.checked
                }))}
              />
            }
            label="Enable Notifications"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateChannel}
            variant="contained"
            disabled={loading || !channelSettings.channelName}
          >
            Create Channel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Channel Settings</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Channel Name"
            fullWidth
            variant="outlined"
            value={channelSettings.channelName}
            onChange={(e) => setChannelSettings(prev => ({
              ...prev,
              channelName: e.target.value
            }))}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Webhook URL"
            fullWidth
            variant="outlined"
            value={channelSettings.webhookUrl}
            onChange={(e) => setChannelSettings(prev => ({
              ...prev,
              webhookUrl: e.target.value
            }))}
            sx={{ mb: 2 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={channelSettings.notificationsEnabled}
                onChange={(e) => setChannelSettings(prev => ({
                  ...prev,
                  notificationsEnabled: e.target.checked
                }))}
              />
            }
            label="Enable Notifications"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              // Update the first channel (in a real app, you'd pass the channel ID)
              handleUpdateChannel(channels[0]?.id, channelSettings);
              setSettingsDialogOpen(false);
            }}
            variant="contained"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamsChannelManager;
