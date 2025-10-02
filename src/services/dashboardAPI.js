import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, ListUsersCommand, AdminListUsersInGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { dynamoConfig, cognitoConfig } from './awsConfig';

// Initialize AWS clients with proper credentials
const dynamoClient = new DynamoDBClient(dynamoConfig);
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const cognitoClient = new CognitoIdentityProviderClient(cognitoConfig);

const TABLE_NAME = process.env.REACT_APP_DYNAMODB_TABLE || 'eams-dev-projects';
const USER_POOL_ID = process.env.REACT_APP_USER_POOL_ID;

class DashboardAPI {
  // Get dashboard statistics
  async getDashboardStats() {
    try {
      const [users, companies, projects, applications] = await Promise.all([
        this.getUserCount(),
        this.getCompanyCount(),
        this.getProjectCount(),
        this.getApplicationCount()
      ]);

      return {
        totalUsers: users,
        totalCompanies: companies,
        totalProjects: projects,
        totalApplications: applications,
        activeUsers: Math.floor(users * 0.7), // Assume 70% are active
        recentActivity: await this.getRecentActivity()
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return fallback data
      return {
        totalUsers: 0,
        totalCompanies: 0,
        totalProjects: 0,
        totalApplications: 0,
        activeUsers: 0,
        recentActivity: []
      };
    }
  }

  // Get user count from Cognito
  async getUserCount() {
    try {
      if (!USER_POOL_ID) {
        console.warn('USER_POOL_ID not configured');
        return 0;
      }

      const command = new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Limit: 60 // AWS limit
      });

      const response = await cognitoClient.send(command);
      return response.Users ? response.Users.length : 0;
    } catch (error) {
      console.error('Error fetching user count:', error);
      return 0;
    }
  }

  // Get company count from DynamoDB
  async getCompanyCount() {
    try {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :companyPrefix)',
        ExpressionAttributeValues: {
          ':companyPrefix': 'COMPANY#'
        },
        Select: 'COUNT'
      });

      const response = await docClient.send(command);
      return response.Count || 0;
    } catch (error) {
      console.error('Error fetching company count:', error);
      return 0;
    }
  }

  // Get project count from DynamoDB
  async getProjectCount() {
    try {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :projectPrefix)',
        ExpressionAttributeValues: {
          ':projectPrefix': 'PROJECT#'
        },
        Select: 'COUNT'
      });

      const response = await docClient.send(command);
      return response.Count || 0;
    } catch (error) {
      console.error('Error fetching project count:', error);
      return 0;
    }
  }

  // Get application count from DynamoDB
  async getApplicationCount() {
    try {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :appPrefix)',
        ExpressionAttributeValues: {
          ':appPrefix': 'APPLICATION#'
        },
        Select: 'COUNT'
      });

      const response = await docClient.send(command);
      return response.Count || 0;
    } catch (error) {
      console.error('Error fetching application count:', error);
      return 0;
    }
  }

  // Get recent activity from DynamoDB
  async getRecentActivity() {
    try {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :activityPrefix)',
        ExpressionAttributeValues: {
          ':activityPrefix': 'ACTIVITY#'
        },
        Limit: 10,
        ScanIndexForward: false // Most recent first
      });

      const response = await docClient.send(command);
      
      if (!response.Items || response.Items.length === 0) {
        // Return some default activity if no real data
        return [
          {
            id: '1',
            type: 'system_startup',
            message: 'EAMS system initialized',
            time: 'Just now',
            icon: 'SystemIcon',
            color: 'info'
          }
        ];
      }

      return response.Items.map((item, index) => ({
        id: item.PK || `activity-${index}`,
        type: item.activityType || 'unknown',
        message: item.message || 'Activity recorded',
        time: this.formatTimeAgo(item.timestamp || new Date().toISOString()),
        icon: this.getActivityIcon(item.activityType),
        color: this.getActivityColor(item.activityType)
      }));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [
        {
          id: '1',
          type: 'system_startup',
          message: 'EAMS system initialized',
          time: 'Just now',
          icon: 'SystemIcon',
          color: 'info'
        }
      ];
    }
  }

  // Get user growth data for charts
  async getUserGrowthData() {
    try {
      // This would typically query a time-series table
      // For now, return sample data
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Users',
            data: [65, 78, 90, 105, 120, 156],
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching user growth data:', error);
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Users',
            data: [0, 0, 0, 0, 0, 0],
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
          }
        ]
      };
    }
  }

  // Get project status distribution
  async getProjectStatusData() {
    try {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :projectPrefix)',
        ExpressionAttributeValues: {
          ':projectPrefix': 'PROJECT#'
        }
      });

      const response = await docClient.send(command);
      
      if (!response.Items || response.Items.length === 0) {
        return {
          labels: ['No Projects'],
          datasets: [
            {
              data: [1],
              backgroundColor: ['#f44336']
            }
          ]
        };
      }

      // Count by status
      const statusCounts = response.Items.reduce((acc, item) => {
        const status = item.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const labels = Object.keys(statusCounts);
      const data = Object.values(statusCounts);
      const colors = labels.map(status => this.getStatusColor(status));

      return {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching project status data:', error);
      return {
        labels: ['Error'],
        datasets: [
          {
            data: [1],
            backgroundColor: ['#f44336']
          }
        ]
      };
    }
  }

  // Helper methods
  formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  }

  getActivityIcon(activityType) {
    const iconMap = {
      'user_created': 'PeopleIcon',
      'project_updated': 'AssessmentIcon',
      'company_added': 'BusinessIcon',
      'application_created': 'StorageIcon',
      'system_startup': 'SystemIcon'
    };
    return iconMap[activityType] || 'InfoIcon';
  }

  getActivityColor(activityType) {
    const colorMap = {
      'user_created': 'success',
      'project_updated': 'info',
      'company_added': 'primary',
      'application_created': 'warning',
      'system_startup': 'info'
    };
    return colorMap[activityType] || 'default';
  }

  getStatusColor(status) {
    const colorMap = {
      'active': '#4caf50',
      'planning': '#2196f3',
      'on_hold': '#ff9800',
      'completed': '#4caf50',
      'cancelled': '#f44336',
      'unknown': '#757575'
    };
    return colorMap[status] || '#757575';
  }
}

export default new DashboardAPI();
