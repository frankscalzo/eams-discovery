exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const { httpMethod, path, pathParameters, queryStringParameters, body, requestContext } = event;
    
    // Extract path - handle both direct path and path from requestContext
    let requestPath = path || requestContext?.path || '';
    // Remove stage prefix if present (e.g., /dev/login -> /login)
    if (requestPath.startsWith('/dev/')) {
        requestPath = requestPath.replace('/dev', '');
    }
    
    console.log('Request path:', requestPath, 'Method:', httpMethod);
    
    // CORS headers - must specify exact origin when using credentials
    const origin = event.headers?.origin || event.headers?.Origin || 'https://dev-discovery.optimumcloudservices.com';
    const headers = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
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

    try {
        // Route based on path
        if (requestPath === '/login' && httpMethod === 'GET') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    message: 'Login endpoint working',
                    redirectUrl: 'https://dev-discovery.optimumcloudservices.com/auth/login'
                })
            };
        }
        
        if (requestPath === '/login' && httpMethod === 'POST') {
            // Handle login POST request
            let loginData = {};
            try {
                loginData = JSON.parse(body || '{}');
            } catch (e) {
                console.error('Error parsing login data:', e);
            }
            
            // Simple authentication logic (replace with real authentication)
            const { username, password } = loginData;
            
            // Mock authentication - replace with real Cognito authentication
            if (username && password) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'Login successful',
                        user: {
                            sub: 'user-123',
                            email: username,
                            name: username,
                            userType: 'admin',
                            companyId: 'primary-company'
                        },
                        accessToken: 'mock-access-token',
                        idToken: 'mock-id-token',
                        refreshToken: 'mock-refresh-token'
                    })
                };
            } else {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Invalid credentials'
                    })
                };
            }
        }
        
        if (requestPath === '/auth/login' && httpMethod === 'GET') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    message: 'Auth login endpoint working',
                    status: 'ready'
                })
            };
        }
        
        if (requestPath === '/logout' && httpMethod === 'POST') {
            // Logout
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Logged out successfully' })
            };
        }
        
        if (requestPath === '/me' && httpMethod === 'GET') {
            // Get current user info
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    user: { 
                        id: 'user-123', 
                        email: 'test@example.com',
                        name: 'Test User',
                        userType: 'admin',
                        companyId: 'primary-company'
                    } 
                })
            };
        }
        
        if (requestPath === '/users' && httpMethod === 'GET') {
            // Get users list
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    users: [
                        {
                            id: 'user-123',
                            email: 'test@example.com',
                            name: 'Test User',
                            userType: 'admin',
                            companyId: 'primary-company'
                        }
                    ]
                })
            };
        }
        
        if (requestPath === '/companies' && httpMethod === 'GET') {
            // Get companies list
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    companies: [
                        {
                            id: 'company-123',
                            name: 'Optimum Cloud Services',
                            type: 'primary'
                        }
                    ]
                })
            };
        }
        
        if (requestPath === '/projects' && httpMethod === 'GET') {
            // Get projects list
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    projects: [
                        {
                            id: 'project-123',
                            name: 'EAMS Project',
                            companyId: 'company-123'
                        }
                    ]
                })
            };
        }
        
        if (requestPath === '/health' && httpMethod === 'GET') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    status: 'healthy', 
                    timestamp: new Date().toISOString(),
                    message: 'API is working'
                })
            };
        }
        
        // Default response for any other path
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: 'EAMS API is working',
                path: requestPath,
                method: httpMethod,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
