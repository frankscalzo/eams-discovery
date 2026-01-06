// API Gateway Service - Frontend service for API Gateway + Lambda architecture
class APIGatewayService {
  constructor() {
    // API Gateway endpoints
    this.authApiUrl = 'https://r9flk98o68.execute-api.us-east-1.amazonaws.com/dev';
    this.dataApiUrl = 'https://r9flk98o68.execute-api.us-east-1.amazonaws.com/dev';
    this.configLoaded = false;
    this.loadConfig();
  }

  async loadConfig() {
    if (this.configLoaded) return;
    
    try {
      const response = await fetch('/config.json');
      const config = await response.json();
      if (config.apiGatewayUrl) {
        this.authApiUrl = config.apiGatewayUrl;
        this.dataApiUrl = config.apiGatewayUrl;
        console.log('APIGatewayService: Loaded API Gateway URL from config:', this.authApiUrl);
      }
      this.configLoaded = true;
    } catch (error) {
      console.error('Error loading config:', error);
      // Keep default URLs
      this.configLoaded = true;
    }
  }

  // Authentication methods
  async login(username, password) {
    await this.loadConfig();
    try {
      const response = await fetch(`${this.authApiUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session management
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout() {
    await this.loadConfig();
    try {
      const response = await fetch(`${this.authApiUrl}/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    await this.loadConfig();
    try {
      const response = await fetch(`${this.authApiUrl}/me`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          return null; // Not authenticated
        }
        throw new Error('Failed to get user info');
      }

      const result = await response.json();
      return result.user;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  // Data methods
  async getUsers() {
    await this.loadConfig();
    try {
      const response = await fetch(`${this.dataApiUrl}/users`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Get users error:', error);
      throw error;
    }
  }

  async getCompanies() {
    await this.loadConfig();
    try {
      const response = await fetch(`${this.dataApiUrl}/companies`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Get companies error:', error);
      throw error;
    }
  }

  async getProjects() {
    await this.loadConfig();
    try {
      const response = await fetch(`${this.dataApiUrl}/projects`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Get projects error:', error);
      throw error;
    }
  }

  async createUser(userData) {
    await this.loadConfig();
    try {
      const response = await fetch(`${this.dataApiUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  }

  async createCompany(companyData) {
    await this.loadConfig();
    try {
      const response = await fetch(`${this.dataApiUrl}/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(companyData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create company');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Create company error:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    await this.loadConfig();
    try {
      const response = await fetch(`${this.dataApiUrl}/health`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Health check failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new APIGatewayService();
