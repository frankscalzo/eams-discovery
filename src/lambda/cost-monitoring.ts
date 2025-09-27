import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';

const costExplorer = new CostExplorerClient({ region: 'us-east-1' });

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { period = 'daily', startDate, endDate, projectId } = event.queryStringParameters || {};

    // Calculate date range
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : (() => {
          const date = new Date();
          switch (period) {
            case 'daily':
              date.setDate(date.getDate() - 7); // Last 7 days
              break;
            case 'weekly':
              date.setDate(date.getDate() - 30); // Last 30 days
              break;
            case 'monthly':
              date.setMonth(date.getMonth() - 12); // Last 12 months
              break;
            default:
              date.setDate(date.getDate() - 7);
          }
          return date;
        })();

    // Build filter for project-specific costs
    const filter = projectId ? {
      Tags: {
        Key: 'Project',
        Values: [projectId]
      }
    } : {
      Or: [
        {
          Dimensions: {
            Key: 'SERVICE',
            Values: [
              'Amazon Simple Storage Service',
              'AWS Lambda',
              'Amazon API Gateway',
              'Amazon Cognito',
              'Amazon DynamoDB',
              'Amazon CloudFront',
              'Amazon CloudWatch',
              'AWS Key Management Service',
              'Amazon Virtual Private Cloud',
              'Amazon Elastic Compute Cloud - Compute',
              'AWS Certificate Manager',
              'Amazon Simple Notification Service',
              'Amazon Simple Email Service',
              'AWS CloudFormation',
              'AWS CloudTrail',
              'AWS Cost Explorer',
              'AWS Support (Business)',
              'EC2 - Other',
            ],
          },
        }
      ],
    };

    // Get cost data from AWS Cost Explorer
    const costData = await costExplorer.send(
      new GetCostAndUsageCommand({
        TimePeriod: {
          Start: start.toISOString().split('T')[0],
          End: end.toISOString().split('T')[0],
        },
        Granularity: period === 'daily' ? 'DAILY' : 'MONTHLY',
        Metrics: ['BlendedCost', 'UnblendedCost', 'UsageQuantity'],
        GroupBy: [
          {
            Type: 'DIMENSION',
            Key: 'SERVICE',
          },
        ],
        Filter: filter,
      })
    );

    // Process the cost data
    const processedData =
      costData.ResultsByTime?.map(timeResult => {
        const groups =
          timeResult.Groups?.map(group => {
            const service = group.Keys?.[0] || 'Unknown';
            const cost = group.Metrics?.BlendedCost?.Amount || '0';
            const usage = group.Metrics?.UsageQuantity?.Amount || '0';

            return {
              service,
              cost: parseFloat(cost),
              usage: parseFloat(usage),
              currency: group.Metrics?.BlendedCost?.Unit || 'USD',
            };
          }) || [];

        return {
          timePeriod: timeResult.TimePeriod,
          totalCost: timeResult.Total?.BlendedCost?.Amount || '0',
          currency: timeResult.Total?.BlendedCost?.Unit || 'USD',
          services: groups,
        };
      }) || [];

    // Calculate totals and breakdowns
    const totalCost = processedData.reduce((sum, period) => {
      const periodTotal = period.services.reduce(
        (serviceSum, service) => serviceSum + service.cost,
        0
      );
      return sum + periodTotal;
    }, 0);

    // Group by service
    const serviceBreakdown = processedData.reduce(
      (acc, period) => {
        period.services.forEach(service => {
          if (!acc[service.service]) {
            acc[service.service] = {
              name: service.service,
              totalCost: 0,
              resources: [],
            };
          }
          acc[service.service].totalCost += service.cost;
          acc[service.service].resources.push({
            resourceId: service.service,
            cost: service.cost,
            usage: service.usage,
          });
        });
        return acc;
      },
      {} as Record<string, any>
    );

    // Get specific resource costs for our application
    const appResources = {
      lambda: serviceBreakdown['AWS Lambda'] || { name: 'AWS Lambda', totalCost: 0, resources: [] },
      s3: serviceBreakdown['Amazon Simple Storage Service'] || {
        name: 'S3',
        totalCost: 0,
        resources: [],
      },
      dynamodb: serviceBreakdown['Amazon DynamoDB'] || {
        name: 'DynamoDB',
        totalCost: 0,
        resources: [],
      },
      cognito: serviceBreakdown['Amazon Cognito'] || {
        name: 'Cognito',
        totalCost: 0,
        resources: [],
      },
      apigateway: serviceBreakdown['Amazon API Gateway'] || {
        name: 'API Gateway',
        totalCost: 0,
        resources: [],
      },
      cloudfront: serviceBreakdown['Amazon CloudFront'] || {
        name: 'CloudFront',
        totalCost: 0,
        resources: [],
      },
      cloudwatch: serviceBreakdown['Amazon CloudWatch'] || {
        name: 'CloudWatch',
        totalCost: 0,
        resources: [],
      },
    };

    const result = {
      period,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      totalCost: parseFloat(totalCost.toFixed(2)),
      currency: 'USD',
      breakdown: {
        byService: Object.values(serviceBreakdown).sort(
          (a: any, b: any) => b.totalCost - a.totalCost
        ),
        byResource: appResources,
      },
      dailyData: processedData,
      summary: {
        averageDailyCost:
          period === 'daily'
            ? parseFloat((totalCost / 7).toFixed(2))
            : period === 'weekly'
              ? parseFloat((totalCost / 4).toFixed(2))
              : parseFloat((totalCost / 12).toFixed(2)),
        highestCostService:
          Object.values(serviceBreakdown).sort((a: any, b: any) => b.totalCost - a.totalCost)[0]
            ?.name || 'Unknown',
        totalResources: Object.values(appResources).reduce(
          (sum, service: any) => sum + service.resources.length,
          0
        ),
      },
    };

    // Format response to match frontend expectations
    const formattedResult = {
      success: true,
      data: processedData.map(period => {
        const periodTotal = period.services.reduce((sum, service) => sum + service.cost, 0);
        return {
          date: period.timePeriod.Start,
          cost: parseFloat(periodTotal.toFixed(2)),
          service: 'Total',
          project: projectId || 'Application Management',
        };
      }),
      breakdown: Object.values(serviceBreakdown)
        .map((service: any) => ({
          service: service.name,
          cost: service.totalCost,
          percentage: totalCost > 0 ? (service.totalCost / totalCost) * 100 : 0,
        }))
        .sort((a: any, b: any) => b.cost - a.cost),
      totalCost: result.totalCost,
      period: result.period,
      startDate: result.startDate,
      endDate: result.endDate,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: JSON.stringify(formattedResult),
    };
  } catch (error) {
    console.error('Error fetching cost breakdown:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: JSON.stringify({ 
        success: false,
        error: 'Failed to fetch cost breakdown',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
