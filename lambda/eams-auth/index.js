const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
const crypto = require('crypto');

const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN || 'eams-dev.auth.us-east-1.amazoncognito.com';
const CLIENT_ID = process.env.CLIENT_ID || 'qevb9qr68ddbm2tr7grmlgtus';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://4duhmwypm2.execute-api.us-east-1.amazonaws.com/dev/auth/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://d1b2c3d4e5f6g7.cloudfront.net';

// Simple session cookie creation (in production, use proper JWT or encrypted cookies)
function createSessionCookie(userInfo) {
    const sessionData = {
        sub: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        iat: Math.floor(Date.now() / 1000)
    };
    
    // Simple base64 encoding (in production, use proper encryption)
    const sessionString = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    return `eams_session=${sessionString}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`;
}

function verifySessionCookie(cookieHeader) {
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
    console.log('Auth event:', JSON.stringify(event, null, 2));
    
    const { httpMethod, path, queryStringParameters, headers } = event;
    
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'CORS preflight' })
        };
    }

    try {
        // Route: /auth/login - redirect to Cognito
        if (path === '/auth/login' && httpMethod === 'GET') {
            const state = crypto.randomBytes(16).toString('hex');
            const authUrl = `https://${COGNITO_DOMAIN}/oauth2/authorize?` +
                new URLSearchParams({
                    client_id: CLIENT_ID,
                    response_type: 'code',
                    redirect_uri: REDIRECT_URI,
                    scope: 'openid email profile',
                    state: state
                }).toString();
            
            return {
                statusCode: 302,
                headers: {
                    'Location': authUrl,
                    'Set-Cookie': `auth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=300`
                },
                body: ''
            };
        }

        // Route: /auth/callback - handle Cognito callback
        if (path === '/auth/callback' && httpMethod === 'GET') {
            const { code, state } = queryStringParameters || {};
            const cookieHeader = headers.Cookie || '';
            const storedState = cookieHeader.match(/auth_state=([^;]+)/)?.[1];
            
            if (!code || !state || state !== storedState) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Invalid callback parameters' })
                };
            }

            // Exchange code for tokens
            const tokenBody = new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: CLIENT_ID,
                code: code,
                redirect_uri: REDIRECT_URI
            });

            const authHeader = CLIENT_SECRET ? 
                `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}` :
                `Bearer ${CLIENT_ID}`;

            const tokenResponse = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': authHeader
                },
                body: tokenResponse
            });

            if (!tokenResponse.ok) {
                console.error('Token exchange failed:', await tokenResponse.text());
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Token exchange failed' })
                };
            }

            const tokens = await tokenResponse.json();
            
            // Get user info from ID token
            const userInfo = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
            
            // Create session cookie
            const sessionCookie = createSessionCookie(userInfo);
            
            return {
                statusCode: 302,
                headers: {
                    'Location': FRONTEND_URL,
                    'Set-Cookie': sessionCookie
                },
                body: ''
            };
        }

        // Route: /auth/me - get current user info
        if (path === '/auth/me' && httpMethod === 'GET') {
            const session = verifySessionCookie(headers.Cookie);
            
            if (!session) {
                return {
                    statusCode: 401,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Not authenticated' })
                };
            }
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    user: {
                        sub: session.sub,
                        email: session.email,
                        name: session.name
                    }
                })
            };
        }

        // Route: /auth/logout - clear session
        if (path === '/auth/logout' && httpMethod === 'POST') {
            return {
                statusCode: 200,
                headers: {
                    ...corsHeaders,
                    'Set-Cookie': 'eams_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
                },
                body: JSON.stringify({ success: true, message: 'Logged out' })
            };
        }

        return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Not found' })
        };

    } catch (error) {
        console.error('Auth error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message })
        };
    }
};
