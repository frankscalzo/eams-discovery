// Backend-for-Frontend API Service
// This service calls our Lambda-based API instead of accessing DynamoDB directly

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://yglqfhmjy5.execute-api.us-east-1.amazonaws.com/dev';

class BffApiService {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    // Generic fetch method with error handling
    async fetch(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const defaultOptions = {
            credentials: 'include', // Include cookies for session management
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    // Authentication methods
    async login() {
        // Redirect to our auth endpoint
        window.location.href = `${this.baseUrl}/auth/login`;
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
