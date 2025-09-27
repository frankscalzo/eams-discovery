import AWS from 'aws-sdk';

const budgetAlertAPI = {
  // AWS services
  ses: new AWS.SES({ region: 'us-east-1' }),
  budgets: new AWS.Budgets({ region: 'us-east-1' }),
  costExplorer: new AWS.CostExplorer({ region: 'us-east-1' }),

  // Create budget for company
  async createCompanyBudget(companyId, budgetData) {
    try {
      const budgetName = `EAMS-Company-${companyId}-${Date.now()}`;
      
      const budget = {
        BudgetName: budgetName,
        BudgetLimit: {
          Amount: budgetData.amount.toString(),
          Unit: budgetData.currency || 'USD'
        },
        TimeUnit: budgetData.timeUnit || 'MONTHLY',
        BudgetType: 'COST',
        CostFilters: {
          Tag: {
            Key: 'Company',
            Values: [companyId]
          }
        },
        NotificationsWithSubscribers: [
          {
            Notification: {
              NotificationType: 'ACTUAL',
              ComparisonOperator: 'GREATER_THAN',
              Threshold: 80,
              ThresholdType: 'PERCENTAGE'
            },
            Subscribers: budgetData.subscribers || []
          },
          {
            Notification: {
              NotificationType: 'ACTUAL',
              ComparisonOperator: 'GREATER_THAN',
              Threshold: 100,
              ThresholdType: 'PERCENTAGE'
            },
            Subscribers: budgetData.subscribers || []
          },
          {
            Notification: {
              NotificationType: 'FORECASTED',
              ComparisonOperator: 'GREATER_THAN',
              Threshold: 100,
              ThresholdType: 'PERCENTAGE'
            },
            Subscribers: budgetData.subscribers || []
          }
        ]
      };

      await this.budgets.createBudget({
        AccountId: process.env.REACT_APP_AWS_ACCOUNT_ID,
        Budget: budget
      }).promise();

      return { success: true, budgetName };
    } catch (error) {
      console.error('Error creating company budget:', error);
      return { success: false, error: error.message };
    }
  },

  // Create budget for project
  async createProjectBudget(companyId, projectId, budgetData) {
    try {
      const budgetName = `EAMS-Project-${companyId}-${projectId}-${Date.now()}`;
      
      const budget = {
        BudgetName: budgetName,
        BudgetLimit: {
          Amount: budgetData.amount.toString(),
          Unit: budgetData.currency || 'USD'
        },
        TimeUnit: budgetData.timeUnit || 'MONTHLY',
        BudgetType: 'COST',
        CostFilters: {
          Tag: {
            Key: 'Project',
            Values: [projectId]
          }
        },
        NotificationsWithSubscribers: [
          {
            Notification: {
              NotificationType: 'ACTUAL',
              ComparisonOperator: 'GREATER_THAN',
              Threshold: 80,
              ThresholdType: 'PERCENTAGE'
            },
            Subscribers: budgetData.subscribers || []
          },
          {
            Notification: {
              NotificationType: 'ACTUAL',
              ComparisonOperator: 'GREATER_THAN',
              Threshold: 100,
              ThresholdType: 'PERCENTAGE'
            },
            Subscribers: budgetData.subscribers || []
          }
        ]
      };

      await this.budgets.createBudget({
        AccountId: process.env.REACT_APP_AWS_ACCOUNT_ID,
        Budget: budget
      }).promise();

      return { success: true, budgetName };
    } catch (error) {
      console.error('Error creating project budget:', error);
      return { success: false, error: error.message };
    }
  },

  // Send budget alert email via SES
  async sendBudgetAlertEmail(alertData) {
    try {
      const { recipients, subject, body, alertType, entityType, entityId } = alertData;
      
      const emailParams = {
        Source: process.env.REACT_APP_SES_FROM_EMAIL || 'noreply@eams.optimumcloudservices.com',
        Destination: {
          ToAddresses: recipients
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: this.generateAlertEmailHTML(alertData),
              Charset: 'UTF-8'
            },
            Text: {
              Data: this.generateAlertEmailText(alertData),
              Charset: 'UTF-8'
            }
          }
        }
      };

      const result = await this.ses.sendEmail(emailParams).promise();
      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('Error sending budget alert email:', error);
      return { success: false, error: error.message };
    }
  },

  // Generate HTML email template for budget alerts
  generateAlertEmailHTML(alertData) {
    const { alertType, entityType, entityId, currentAmount, budgetAmount, threshold, percentage } = alertData;
    
    const severity = percentage >= 100 ? 'high' : percentage >= 80 ? 'medium' : 'low';
    const severityColor = severity === 'high' ? '#d32f2f' : severity === 'medium' ? '#f57c00' : '#1976d2';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>EAMS Budget Alert</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background-color: ${severityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .alert-box { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 15px 0; }
        .metrics { display: flex; justify-content: space-between; margin: 20px 0; }
        .metric { text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: ${severityColor}; }
        .metric-label { font-size: 14px; color: #666; }
        .footer { background-color: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
        .button { display: inline-block; background-color: ${severityColor}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 EAMS Budget Alert</h1>
          <p>${alertType} - ${entityType} ${entityId}</p>
        </div>
        
        <div class="content">
          <div class="alert-box">
            <h3>Budget Threshold Exceeded</h3>
            <p>Your ${entityType.toLowerCase()} budget has reached <strong>${percentage.toFixed(1)}%</strong> of the allocated amount.</p>
          </div>
          
          <div class="metrics">
            <div class="metric">
              <div class="metric-value">$${currentAmount.toFixed(2)}</div>
              <div class="metric-label">Current Spend</div>
            </div>
            <div class="metric">
              <div class="metric-value">$${budgetAmount.toFixed(2)}</div>
              <div class="metric-label">Budget Limit</div>
            </div>
            <div class="metric">
              <div class="metric-value">${percentage.toFixed(1)}%</div>
              <div class="metric-label">Utilization</div>
            </div>
          </div>
          
          <h3>Recommended Actions:</h3>
          <ul>
            <li>Review current resource usage and identify cost optimization opportunities</li>
            <li>Consider scaling down non-essential resources</li>
            <li>Review and adjust budget limits if necessary</li>
            <li>Contact your project manager for budget adjustments</li>
          </ul>
          
          <a href="${process.env.REACT_APP_FRONTEND_URL}/companies" class="button">View Company Dashboard</a>
          <a href="${process.env.REACT_APP_FRONTEND_URL}/projects" class="button">View Project Dashboard</a>
        </div>
        
        <div class="footer">
          <p>This is an automated alert from the EAMS (Enterprise Architecture Management System).</p>
          <p>To manage your alert preferences, please contact your system administrator.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  },

  // Generate text email template for budget alerts
  generateAlertEmailText(alertData) {
    const { alertType, entityType, entityId, currentAmount, budgetAmount, threshold, percentage } = alertData;
    
    return `
EAMS BUDGET ALERT
================

Alert Type: ${alertType}
Entity: ${entityType} ${entityId}
Threshold: ${threshold}%
Current Utilization: ${percentage.toFixed(1)}%

CURRENT SPEND: $${currentAmount.toFixed(2)}
BUDGET LIMIT: $${budgetAmount.toFixed(2)}

This is an automated alert from the EAMS (Enterprise Architecture Management System).

Recommended Actions:
- Review current resource usage
- Identify cost optimization opportunities
- Consider scaling down non-essential resources
- Contact your project manager for budget adjustments

View Dashboard: ${process.env.REACT_APP_FRONTEND_URL}/companies

To manage your alert preferences, please contact your system administrator.
    `;
  },

  // Get current budget status
  async getBudgetStatus(companyId, projectId = null) {
    try {
      const budgets = await this.budgets.describeBudgets({
        AccountId: process.env.REACT_APP_AWS_ACCOUNT_ID
      }).promise();

      const relevantBudgets = budgets.Budgets.filter(budget => {
        if (projectId) {
          return budget.BudgetName.includes(`Project-${companyId}-${projectId}`);
        } else {
          return budget.BudgetName.includes(`Company-${companyId}`);
        }
      });

      const statuses = [];
      
      for (const budget of relevantBudgets) {
        // Get current spend for this budget
        const currentSpend = await this.getCurrentSpend(companyId, projectId);
        const budgetAmount = parseFloat(budget.BudgetLimit.Amount);
        const percentage = (currentSpend / budgetAmount) * 100;
        
        statuses.push({
          budgetName: budget.BudgetName,
          budgetAmount,
          currentSpend,
          percentage,
          timeUnit: budget.TimeUnit,
          status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'normal'
        });
      }

      return statuses;
    } catch (error) {
      console.error('Error getting budget status:', error);
      throw error;
    }
  },

  // Get current spend for budget calculation
  async getCurrentSpend(companyId, projectId = null) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const params = {
        TimePeriod: {
          Start: startDate.toISOString().split('T')[0],
          End: endDate.toISOString().split('T')[0]
        },
        Granularity: 'MONTHLY',
        Metrics: ['BlendedCost'],
        Filter: {
          Tag: {
            Key: 'Company',
            Values: [companyId]
          }
        }
      };

      if (projectId) {
        params.Filter.And = [
          {
            Tag: {
              Key: 'Company',
              Values: [companyId]
            }
          },
          {
            Tag: {
              Key: 'Project',
              Values: [projectId]
            }
          }
        ];
        delete params.Filter.Tag;
      }

      const result = await this.costExplorer.getCostAndUsage(params).promise();
      
      if (result.ResultsByTime && result.ResultsByTime.length > 0) {
        return parseFloat(result.ResultsByTime[0].Total.BlendedCost.Amount);
      }
      
      return 0;
    } catch (error) {
      console.error('Error getting current spend:', error);
      return 0;
    }
  },

  // Create alert rule
  async createAlertRule(ruleData) {
    try {
      const { companyId, projectId, alertType, threshold, recipients, conditions } = ruleData;
      
      // Store alert rule in DynamoDB
      const rule = {
        PK: `ALERT_RULE#${companyId}`,
        SK: projectId ? `PROJECT#${projectId}` : 'COMPANY',
        GSI1PK: 'ALERT_RULES',
        GSI1SK: `${alertType}#${Date.now()}`,
        RuleId: `RULE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        CompanyId: companyId,
        ProjectId: projectId,
        AlertType: alertType,
        Threshold: threshold,
        Recipients: recipients,
        Conditions: conditions,
        Status: 'active',
        CreatedAt: new Date().toISOString(),
        EntityType: 'ALERT_RULE'
      };

      // This would store in DynamoDB
      // await this.dynamodb.put({ TableName: this.tableName, Item: rule }).promise();

      return { success: true, rule };
    } catch (error) {
      console.error('Error creating alert rule:', error);
      return { success: false, error: error.message };
    }
  },

  // Process budget alerts (called by Lambda or scheduled job)
  async processBudgetAlerts() {
    try {
      // Get all active alert rules
      const rules = await this.getActiveAlertRules();
      
      for (const rule of rules) {
        const budgetStatus = await this.getBudgetStatus(rule.CompanyId, rule.ProjectId);
        
        for (const status of budgetStatus) {
          if (status.percentage >= rule.Threshold) {
            await this.sendBudgetAlertEmail({
              recipients: rule.Recipients,
              subject: `EAMS Budget Alert - ${status.percentage.toFixed(1)}% of budget used`,
              body: `Budget alert for ${rule.ProjectId ? 'project' : 'company'} ${rule.ProjectId || rule.CompanyId}`,
              alertType: rule.AlertType,
              entityType: rule.ProjectId ? 'Project' : 'Company',
              entityId: rule.ProjectId || rule.CompanyId,
              currentAmount: status.currentSpend,
              budgetAmount: status.budgetAmount,
              threshold: rule.Threshold,
              percentage: status.percentage
            });
          }
        }
      }

      return { success: true, processed: rules.length };
    } catch (error) {
      console.error('Error processing budget alerts:', error);
      return { success: false, error: error.message };
    }
  },

  // Get active alert rules
  async getActiveAlertRules() {
    try {
      // This would query DynamoDB for active alert rules
      // For now, returning mock data
      return [
        {
          CompanyId: 'company-1',
          ProjectId: null,
          AlertType: 'budget_exceeded',
          Threshold: 80,
          Recipients: ['admin@company.com', 'pm@company.com']
        }
      ];
    } catch (error) {
      console.error('Error getting active alert rules:', error);
      return [];
    }
  },

  // Update alert preferences
  async updateAlertPreferences(companyId, projectId, preferences) {
    try {
      const { emailFrequency, alertThresholds, recipients, channels } = preferences;
      
      // Store preferences in DynamoDB
      const prefs = {
        PK: `ALERT_PREFS#${companyId}`,
        SK: projectId ? `PROJECT#${projectId}` : 'COMPANY',
        CompanyId: companyId,
        ProjectId: projectId,
        EmailFrequency: emailFrequency,
        AlertThresholds: alertThresholds,
        Recipients: recipients,
        Channels: channels,
        UpdatedAt: new Date().toISOString(),
        EntityType: 'ALERT_PREFERENCES'
      };

      // await this.dynamodb.put({ TableName: this.tableName, Item: prefs }).promise();

      return { success: true };
    } catch (error) {
      console.error('Error updating alert preferences:', error);
      return { success: false, error: error.message };
    }
  }
};

export default budgetAlertAPI;
