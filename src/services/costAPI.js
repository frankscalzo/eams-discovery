import { 
  CostExplorerClient, 
  GetCostAndUsageCommand,
  GetDimensionValuesCommand,
  GetReservationCoverageCommand
} from '@aws-sdk/client-cost-explorer';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';

// Load config from public/config.json
let config = null;
fetch('/config.json')
  .then(response => response.json())
  .then(data => config = data)
  .catch(error => console.error('Error loading config:', error));

// AWS SDK clients
const costExplorerClient = new CostExplorerClient({ region: 'us-east-1' }); // Cost Explorer is only available in us-east-1
const dynamoClient = new DynamoDBClient({ region: config?.awsRegion || 'us-east-1' });

// Helper function to unmarshall DynamoDB items
const unmarshallItem = (item) => {
  if (!item) return null;
  
  const result = {};
  for (const [key, value] of Object.entries(item)) {
    if (value.S) result[key] = value.S;
    else if (value.N) result[key] = Number(value.N);
    else if (value.BOOL !== undefined) result[key] = value.BOOL;
    else if (value.L) result[key] = value.L.map(unmarshallItem);
    else if (value.M) result[key] = unmarshallItem(value.M);
    else if (value.SS) result[key] = value.SS;
    else if (value.NS) result[key] = value.NS.map(Number);
    else result[key] = value;
  }
  return result;
};

// Get cost data for a specific project or all projects
export const getCostData = async (projectId, period = 'daily') => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    
    // Set date range based on period
    switch (period) {
      case 'daily':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'weekly':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'monthly':
        startDate.setDate(endDate.getDate() - 365);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get cost and usage data
    const costCommand = new GetCostAndUsageCommand({
      TimePeriod: {
        Start: startDate.toISOString().split('T')[0],
        End: endDate.toISOString().split('T')[0]
      },
      Granularity: period === 'daily' ? 'DAILY' : period === 'weekly' ? 'WEEKLY' : 'MONTHLY',
      Metrics: ['BlendedCost'],
      GroupBy: [
        {
          Type: 'DIMENSION',
          Key: 'SERVICE'
        }
      ],
      Filter: projectId ? {
        Tags: {
          Key: 'Project',
          Values: [projectId]
        }
      } : undefined
    });

    const costResult = await costExplorerClient.send(costCommand);
    
    // Process cost data
    const costData = [];
    const serviceCosts = {};
    let totalCost = 0;

    if (costResult.ResultsByTime) {
      costResult.ResultsByTime.forEach(timeResult => {
        const date = timeResult.TimePeriod.Start;
        const groups = timeResult.Groups || [];
        
        groups.forEach(group => {
          const service = group.Keys[0];
          const cost = parseFloat(group.Metrics.BlendedCost.Amount);
          
          if (cost > 0) {
            costData.push({
              date,
              cost,
              service,
              project: projectId
            });
            
            if (!serviceCosts[service]) {
              serviceCosts[service] = 0;
            }
            serviceCosts[service] += cost;
            totalCost += cost;
          }
        });
      });
    }

    // Create cost breakdown
    const costBreakdown = Object.entries(serviceCosts)
      .map(([service, cost]) => ({
        service,
        cost,
        percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0,
        category: getServiceCategory(service)
      }))
      .sort((a, b) => b.cost - a.cost);

    // Get project budget if projectId is provided
    let budget = 1000; // Default budget
    if (projectId) {
      try {
        const project = await getProjectBudget(projectId);
        budget = project?.budget || 1000;
      } catch (error) {
        console.warn('Could not fetch project budget:', error);
      }
    }

    return {
      costData,
      breakdown: costBreakdown,
      totalCost,
      budget,
      period,
      projectId
    };
  } catch (error) {
    console.error('Error fetching cost data:', error);
    throw new Error('Failed to fetch cost data');
  }
};

// Get cost data by service
export const getCostByService = async (service, period = 'daily') => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const command = new GetCostAndUsageCommand({
      TimePeriod: {
        Start: startDate.toISOString().split('T')[0],
        End: endDate.toISOString().split('T')[0]
      },
      Granularity: 'DAILY',
      Metrics: ['BlendedCost'],
      GroupBy: [
        {
          Type: 'DIMENSION',
          Key: 'SERVICE'
        }
      ],
      Filter: {
        Dimensions: {
          Key: 'SERVICE',
          Values: [service]
        }
      }
    });

    const result = await costExplorerClient.send(command);
    
    const costData = [];
    if (result.ResultsByTime) {
      result.ResultsByTime.forEach(timeResult => {
        const date = timeResult.TimePeriod.Start;
        const groups = timeResult.Groups || [];
        
        groups.forEach(group => {
          const cost = parseFloat(group.Metrics.BlendedCost.Amount);
          if (cost > 0) {
            costData.push({
              date,
              cost,
              service: group.Keys[0]
            });
          }
        });
      });
    }

    return costData;
  } catch (error) {
    console.error('Error fetching cost by service:', error);
    throw new Error('Failed to fetch cost by service');
  }
};

// Get cost trends
export const getCostTrends = async (projectId, days = 30) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const command = new GetCostAndUsageCommand({
      TimePeriod: {
        Start: startDate.toISOString().split('T')[0],
        End: endDate.toISOString().split('T')[0]
      },
      Granularity: 'DAILY',
      Metrics: ['BlendedCost'],
      GroupBy: [
        {
          Type: 'DIMENSION',
          Key: 'SERVICE'
        }
      ],
      Filter: projectId ? {
        Tags: {
          Key: 'Project',
          Values: [projectId]
        }
      } : undefined
    });

    const result = await costExplorerClient.send(command);
    
    const trends = {};
    if (result.ResultsByTime) {
      result.ResultsByTime.forEach(timeResult => {
        const date = timeResult.TimePeriod.Start;
        const groups = timeResult.Groups || [];
        
        groups.forEach(group => {
          const service = group.Keys[0];
          const cost = parseFloat(group.Metrics.BlendedCost.Amount);
          
          if (!trends[service]) {
            trends[service] = [];
          }
          
          trends[service].push({
            date,
            cost
          });
        });
      });
    }

    return trends;
  } catch (error) {
    console.error('Error fetching cost trends:', error);
    throw new Error('Failed to fetch cost trends');
  }
};

// Get reservation coverage
export const getReservationCoverage = async (projectId) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const command = new GetReservationCoverageCommand({
      TimePeriod: {
        Start: startDate.toISOString().split('T')[0],
        End: endDate.toISOString().split('T')[0]
      },
      GroupBy: [
        {
          Type: 'DIMENSION',
          Key: 'SERVICE'
        }
      ],
      Filter: projectId ? {
        Tags: {
          Key: 'Project',
          Values: [projectId]
        }
      } : undefined
    });

    const result = await costExplorerClient.send(command);
    
    const coverage = [];
    if (result.CoveragesByTime) {
      result.CoveragesByTime.forEach(timeResult => {
        const groups = timeResult.Groups || [];
        
        groups.forEach(group => {
          const service = group.Keys[0];
          const coveragePercentage = parseFloat(group.Coverage.CoverageHours.Percentage);
          
          coverage.push({
            service,
            coverage: coveragePercentage,
            date: timeResult.TimePeriod.Start
          });
        });
      });
    }

    return coverage;
  } catch (error) {
    console.error('Error fetching reservation coverage:', error);
    throw new Error('Failed to fetch reservation coverage');
  }
};

// Get project budget from DynamoDB
const getProjectBudget = async (projectId) => {
  try {
    const result = await dynamoClient.send(new QueryCommand({
      TableName: process.env.REACT_APP_DYNAMODB_TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': { S: `PROJ#${projectId}#META` },
        ':sk': { S: 'META#PROJECT' }
      }
    }));

    if (result.Items && result.Items.length > 0) {
      return unmarshallItem(result.Items[0]);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching project budget:', error);
    return null;
  }
};

// Set project budget
export const setProjectBudget = async (projectId, budget) => {
  try {
    // This would update the project record in DynamoDB
    // Implementation depends on your project update API
    console.log(`Setting budget for project ${projectId} to ${budget}`);
    return true;
  } catch (error) {
    console.error('Error setting project budget:', error);
    throw new Error('Failed to set project budget');
  }
};

// Get cost alerts
export const getCostAlerts = async (projectId) => {
  try {
    const costData = await getCostData(projectId, 'daily');
    const budget = costData.budget;
    const totalCost = costData.totalCost;
    
    const alerts = [];
    
    // Budget alerts
    const budgetUtilization = (totalCost / budget) * 100;
    if (budgetUtilization > 90) {
      alerts.push({
        type: 'critical',
        message: `Budget exceeded 90% (${budgetUtilization.toFixed(1)}%)`,
        service: 'Budget',
        cost: totalCost
      });
    } else if (budgetUtilization > 75) {
      alerts.push({
        type: 'warning',
        message: `Budget exceeded 75% (${budgetUtilization.toFixed(1)}%)`,
        service: 'Budget',
        cost: totalCost
      });
    }
    
    // Service cost alerts
    costData.breakdown.forEach(service => {
      if (service.percentage > 50) {
        alerts.push({
          type: 'info',
          message: `${service.service} represents ${service.percentage.toFixed(1)}% of total cost`,
          service: service.service,
          cost: service.cost
        });
      }
    });
    
    return alerts;
  } catch (error) {
    console.error('Error fetching cost alerts:', error);
    throw new Error('Failed to fetch cost alerts');
  }
};

// Get service category for better organization
const getServiceCategory = (service) => {
  const categories = {
    'EC2': 'Compute',
    'ECS': 'Compute',
    'EKS': 'Compute',
    'Lambda': 'Compute',
    'S3': 'Storage',
    'EBS': 'Storage',
    'EFS': 'Storage',
    'DynamoDB': 'Database',
    'RDS': 'Database',
    'ElastiCache': 'Database',
    'CloudFront': 'Networking',
    'Route 53': 'Networking',
    'VPC': 'Networking',
    'API Gateway': 'Networking',
    'Cognito': 'Security',
    'IAM': 'Security',
    'KMS': 'Security',
    'Secrets Manager': 'Security',
    'CloudWatch': 'Monitoring',
    'X-Ray': 'Monitoring',
    'SNS': 'Messaging',
    'SQS': 'Messaging'
  };
  
  return categories[service] || 'Other';
};

// Export all functions
export default {
  getCostData,
  getCostByService,
  getCostTrends,
  getReservationCoverage,
  setProjectBudget,
  getCostAlerts
};
