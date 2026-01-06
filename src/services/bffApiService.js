// Backend-for-Frontend API Service
// This service calls our Lambda-based API instead of accessing DynamoDB directly

class BffApiService {
    constructor() {
        this.baseUrl = 'https://r9flk98o68.execute-api.us-east-1.amazonaws.com/dev';
        this.configLoaded = false;
        this.loadConfig();
    }

    async loadConfig() {
        if (this.configLoaded) return;
        
        try {
            const response = await fetch('/config.json');
            const config = await response.json();
            if (config.apiGatewayUrl) {
                this.baseUrl = config.apiGatewayUrl;
                console.log('BffApiService: Loaded API Gateway URL from config:', this.baseUrl);
            }
            this.configLoaded = true;
        } catch (error) {
            console.error('Error loading config:', error);
            // Keep default URL
            this.configLoaded = true;
        }
    }

    // Generic fetch method with error handling and timeout
    async fetch(endpoint, options = {}) {
        // Ensure config is loaded before making requests
        await this.loadConfig();
        
        const url = `${this.baseUrl}${endpoint}`;
        
        const defaultOptions = {
            credentials: 'include', // Include cookies for session management
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout: The server took too long to respond')), 30000);
        });

        try {
            console.log(`BffApiService: Making request to ${url}`);
            const fetchPromise = fetch(url, { ...defaultOptions, ...options });
            
            // Race between fetch and timeout
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            
            console.log(`BffApiService: Response status: ${response.status} for ${endpoint}`);
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }
                throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            let data;
            try {
                data = await response.json();
            } catch (e) {
                console.error(`BffApiService: Failed to parse JSON response:`, e);
                throw new Error('Invalid response format from server');
            }
            
            console.log(`BffApiService: Success response for ${endpoint}:`, data);
            return data;
        } catch (error) {
            console.error(`BffApiService: API Error (${endpoint}):`, error);
            // Re-throw with more context if it's a network error
            if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
                throw new Error('Network error: Unable to connect to API. Please check your connection and try again.');
            }
            if (error.message.includes('timeout')) {
                throw new Error('Request timeout: The server took too long to respond. Please try again.');
            }
            throw error;
        }
    }

    // Authentication methods
    async login(username, password) {
        // Make API call to login endpoint
        const response = await this.fetch('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        // Ensure response has success property
        if (!response || typeof response.success === 'undefined') {
            throw new Error('Invalid login response from server');
        }
        
        return response;
    }

    async getCurrentUser() {
        return this.fetch('/auth/me');
    }

    async logout() {
        return this.fetch('/auth/logout', { method: 'POST' });
    }

    // Data methods
    async getUsers() {
        return this.fetch('/users');
    }

    async createUser(userData) {
        return this.fetch('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async getCompanies() {
        return this.fetch('/companies');
    }

    async createCompany(companyData) {
        return this.fetch('/companies', {
            method: 'POST',
            body: JSON.stringify(companyData)
        });
    }

    async getProjects() {
        return this.fetch('/projects');
    }

    async createProject(projectData) {
        return this.fetch('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
    }

    // Health check
    async healthCheck() {
        return this.fetch('/health');
    }
}

// Export singleton instance
export default new BffApiService();
