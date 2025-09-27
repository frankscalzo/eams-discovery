import AWS from 'aws-sdk';

const teamsAPI = {
  // Teams configuration
  config: {
    webhookUrl: process.env.REACT_APP_TEAMS_WEBHOOK_URL || '',
    botId: process.env.REACT_APP_TEAMS_BOT_ID || '',
    tenantId: process.env.REACT_APP_TEAMS_TENANT_ID || '',
    clientId: process.env.REACT_APP_TEAMS_CLIENT_ID || '',
    clientSecret: process.env.REACT_APP_TEAMS_CLIENT_SECRET || ''
  },

  // Get Teams configuration from Parameter Store
  async getConfig(companyId, projectId = null) {
    try {
      const ssm = new AWS.SSM({ region: process.env.REACT_APP_AWS_REGION || 'us-east-1' });
      
      // Base company config
      const baseParams = {
        Names: [
          `/eams/teams/${companyId}/webhook-url`,
          `/eams/teams/${companyId}/bot-id`,
          `/eams/teams/${companyId}/tenant-id`,
          `/eams/teams/${companyId}/client-id`,
          `/eams/teams/${companyId}/client-secret`
        ],
        WithDecryption: true
      };

      // Project-specific webhook if available
      if (projectId) {
        baseParams.Names.push(`/eams/teams/${companyId}/projects/${projectId}/webhook-url`);
      }
      
      const result = await ssm.getParameters(baseParams).promise();
      const config = {};
      
      result.Parameters.forEach(param => {
        const key = param.Name.split('/').pop();
        config[key] = param.Value;
      });
      
      return { ...this.config, ...config };
    } catch (error) {
      console.warn(`Could not load Teams config for company ${companyId}, project ${projectId}:`, error);
      return this.config;
    }
  },

  // Send notification to company-specific Teams channel
  async sendNotification(companyId, message, type = 'info', projectId = null) {
    try {
      const config = await this.getConfig(companyId, projectId);
      
      // Try project-specific webhook first, fallback to company webhook
      const webhookUrl = config[`projects/${projectId}/webhook-url`] || config.webhookUrl;
      
      if (!webhookUrl) {
        console.warn(`No Teams webhook configured for company ${companyId}${projectId ? `, project ${projectId}` : ''}`);
        return { success: false, error: 'No webhook configured' };
      }

      const adaptiveCard = this.createAdaptiveCard(message, type, companyId, projectId);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'message',
          attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: adaptiveCard
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Teams API error: ${response.status} ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending Teams notification:', error);
      return { success: false, error: error.message };
    }
  },

  // Create adaptive card for Teams
  createAdaptiveCard(message, type, companyId, projectId = null) {
    const colors = {
      info: '#0078D4',
      success: '#107C10',
      warning: '#FF8C00',
      error: '#D13438'
    };

    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    const projectText = projectId ? ` - Project ${projectId}` : '';
    const channelText = projectId ? ` (Channel: EAMS-${projectId})` : '';

    return {
      type: 'AdaptiveCard',
      version: '1.3',
      body: [
        {
          type: 'Container',
          style: 'emphasis',
          items: [
            {
              type: 'TextBlock',
              text: `${icons[type]} EAMS Notification - Company ${companyId}${projectText}`,
              weight: 'Bolder',
              color: 'Light',
              size: 'Medium'
            }
          ],
          backgroundColor: colors[type]
        },
        {
          type: 'Container',
          items: [
            {
              type: 'TextBlock',
              text: message.title || 'EAMS Update',
              weight: 'Bolder',
              size: 'Medium',
              wrap: true
            },
            {
              type: 'TextBlock',
              text: message.description || message.text || '',
              wrap: true,
              spacing: 'Small'
            },
            ...(projectId ? [{
              type: 'TextBlock',
              text: `📋 Project: ${projectId}${channelText}`,
              size: 'Small',
              color: 'Accent',
              spacing: 'Small'
            }] : [])
          ],
          spacing: 'Medium'
        },
        ...(message.actions ? [{
          type: 'ActionSet',
          actions: message.actions
        }] : [])
      ]
    };
  },

  // Send application created notification
  async notifyApplicationCreated(companyId, application, projectId) {
    const message = {
      title: 'New Application Added',
      description: `Application "${application.ApplicationName}" has been added to project ${projectId}`,
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View Application',
          url: `${window.location.origin}/projects/${projectId}/applications/${application.ApplicationID}`
        }
      ]
    };

    return await this.sendNotification(companyId, message, 'success', projectId);
  },

  // Send application updated notification
  async notifyApplicationUpdated(companyId, application, projectId, changes) {
    const changeText = changes.map(change => 
      `• ${change.field}: ${change.oldValue} → ${change.newValue}`
    ).join('\n');

    const message = {
      title: 'Application Updated',
      description: `Application "${application.ApplicationName}" has been updated:\n\n${changeText}`,
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View Application',
          url: `${window.location.origin}/projects/${projectId}/applications/${application.ApplicationID}`
        }
      ]
    };

    return await this.sendNotification(companyId, message, 'info', projectId);
  },

  // Send testing status update notification
  async notifyTestingStatusUpdate(companyId, application, projectId, oldStatus, newStatus) {
    const message = {
      title: 'Testing Status Changed',
      description: `Application "${application.ApplicationName}" testing status changed from "${oldStatus}" to "${newStatus}"`,
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View Application',
          url: `${window.location.origin}/projects/${projectId}/applications/${application.ApplicationID}`
        }
      ]
    };

    return await this.sendNotification(companyId, message, 'warning', projectId);
  },

  // Send dependency alert notification
  async notifyDependencyAlert(companyId, application, projectId, dependency) {
    const message = {
      title: 'Dependency Alert',
      description: `Application "${application.ApplicationName}" has a new dependency on "${dependency.name}"`,
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View Dependencies',
          url: `${window.location.origin}/projects/${projectId}/dependencies`
        }
      ]
    };

    return await this.sendNotification(companyId, message, 'warning', projectId);
  },

  // Send project milestone notification
  async notifyProjectMilestone(companyId, projectId, milestone, description) {
    const message = {
      title: 'Project Milestone Reached',
      description: `Project ${projectId}: ${milestone}\n\n${description}`,
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View Project',
          url: `${window.location.origin}/projects/${projectId}/dashboard`
        }
      ]
    };

    return await this.sendNotification(companyId, message, 'success', projectId);
  },

  // Send file upload notification
  async notifyFileUploaded(companyId, application, projectId, fileName, fileSize) {
    const message = {
      title: 'File Uploaded',
      description: `File "${fileName}" (${this.formatFileSize(fileSize)}) uploaded for application "${application.ApplicationName}"`,
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View Files',
          url: `${window.location.origin}/projects/${projectId}/applications/${application.ApplicationID}/files`
        }
      ]
    };

    return await this.sendNotification(companyId, message, 'info', projectId);
  },

  // Send Confluence page created notification
  async notifyConfluencePageCreated(companyId, application, projectId, pageUrl) {
    const message = {
      title: 'Documentation Created',
      description: `Confluence page created for application "${application.ApplicationName}"`,
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View Documentation',
          url: pageUrl
        }
      ]
    };

    return await this.sendNotification(companyId, message, 'info', projectId);
  },

  // Create Teams channel for new project
  async createProjectChannel(companyId, projectId, projectName) {
    try {
      const config = await this.getConfig(companyId);
      
      if (!config.botId || !config.tenantId || !config.clientId || !config.clientSecret) {
        console.warn(`Incomplete Teams bot configuration for company ${companyId}`);
        return { success: false, error: 'Bot not configured' };
      }

      // This would require Microsoft Graph API integration
      // For now, we'll return a placeholder
      return {
        success: true,
        channelId: `project-${projectId}`,
        channelName: `EAMS-${projectName}`,
        message: 'Channel creation requires Microsoft Graph API integration'
      };
    } catch (error) {
      console.error('Error creating Teams channel:', error);
      return { success: false, error: error.message };
    }
  },

  // Send daily summary notification
  async sendDailySummary(companyId, summary) {
    const message = {
      title: 'Daily EAMS Summary',
      description: `Applications: ${summary.totalApplications}\n` +
                  `Updated Today: ${summary.updatedToday}\n` +
                  `Testing In Progress: ${summary.testingInProgress}\n` +
                  `Dependencies: ${summary.totalDependencies}`,
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View Dashboard',
          url: `${window.location.origin}/projects`
        }
      ]
    };

    return await this.sendNotification(companyId, message, 'info');
  },

  // Format file size for display
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

export default teamsAPI;
