const { DynamoDBClient, ScanCommand, PutItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Simple session verification (matches auth Lambda)
function verifySession(cookieHeader) {
    if (!cookieHeader) return null;
    
    const match = cookieHeader.match(/eams_session=([^;]+)/);
    if (!match) return null;
    
    try {
        const sessionData = JSON.parse(Buffer.from(match[1], 'base64').toString());
        
        // Check expiration
        if (sessionData.exp && sessionData.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }
        
        return sessionData;
    } catch (error) {
        console.error('Error parsing session cookie:', error);
        return null;
    }
}

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const { httpMethod, path, pathParameters, queryStringParameters, body } = event;
    
    try {
        // CORS headers
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Content-Type': 'application/json'
        };

        // Handle preflight requests
        if (httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'CORS preflight' })
            };
        }

        // Check authentication for all protected routes
        const session = verifySession(headers.Cookie);
        if (!session && path !== '/health') {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Not authenticated' })
            };
        }

        // Route based on path
        if (path === '/users' && httpMethod === 'GET') {
            return await getUsers(headers, session);
        } else if (path === '/companies' && httpMethod === 'GET') {
            return await getCompanies(headers, session);
        } else if (path === '/projects' && httpMethod === 'GET') {
            return await getProjects(headers, session);
        } else if (path === '/companies' && httpMethod === 'POST') {
            const companyData = JSON.parse(body || '{}');
            return await createCompany(companyData, headers, session);
        } else if (path === '/users' && httpMethod === 'POST') {
            const userData = JSON.parse(body || '{}');
            return await createUser(userData, headers, session);
        } else if (path === '/health' && httpMethod === 'GET') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() })
            };
        } else {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Not found' })
            };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function getUsers(headers, session) {
    try {
        const command = new ScanCommand({
            TableName: process.env.USERS_TABLE || 'eams-dev-users'
        });
        
        const result = await dynamoClient.send(command);
        const users = result.Items ? result.Items.map(item => unmarshall(item)) : [];
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                users,
                count: users.length
            })
        };
    } catch (error) {
        console.error('Error getting users:', error);
        throw error;
    }
}

async function getCompanies(headers, session) {
    try {
        const command = new ScanCommand({
            TableName: process.env.COMPANIES_TABLE || 'eams-dev-companies'
        });
        
        const result = await dynamoClient.send(command);
        const companies = result.Items ? result.Items.map(item => unmarshall(item)) : [];
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                companies,
                count: companies.length
            })
        };
    } catch (error) {
        console.error('Error getting companies:', error);
        throw error;
    }
}

async function getProjects(headers, session) {
    try {
        const command = new ScanCommand({
            TableName: process.env.PROJECTS_TABLE || 'eams-dev-projects'
        });
        
        const result = await dynamoClient.send(command);
        const projects = result.Items ? result.Items.map(item => unmarshall(item)) : [];
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                projects,
                count: projects.length
            })
        };
    } catch (error) {
        console.error('Error getting projects:', error);
        throw error;
    }
}

async function createCompany(companyData, headers, session) {
    try {
        const item = {
            CompanyID: `company-${Date.now()}`,
            CompanyName: companyData.CompanyName || '',
            Address: companyData.Address || {},
            ProjectManager: companyData.ProjectManager || {},
            ExecutiveSponsor: companyData.ExecutiveSponsor || {},
            IntegrationSettings: companyData.IntegrationSettings || {},
            CompanyDistribution: companyData.CompanyDistribution || {},
            CompanyFiles: companyData.CompanyFiles || [],
            CreatedAt: new Date().toISOString(),
            UpdatedAt: new Date().toISOString()
        };

        const command = new PutItemCommand({
            TableName: process.env.COMPANIES_TABLE || 'eams-dev-companies',
            Item: marshall(item)
        });
        
        await dynamoClient.send(command);
        
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Company created successfully',
                company: item
            })
        };
    } catch (error) {
        console.error('Error creating company:', error);
        throw error;
    }
}

async function createUser(userData, headers, session) {
    try {
        const item = {
            UserID: `user-${Date.now()}`,
            Username: userData.Username || '',
            Email: userData.Email || '',
            FirstName: userData.FirstName || '',
            LastName: userData.LastName || '',
            UserType: userData.UserType || 'standard',
            IsActive: true,
            CreatedAt: new Date().toISOString(),
            UpdatedAt: new Date().toISOString()
        };

        const command = new PutItemCommand({
            TableName: process.env.USERS_TABLE || 'eams-dev-users',
            Item: marshall(item)
        });
        
        await dynamoClient.send(command);
        
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'User created successfully',
                user: item
            })
        };
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}
