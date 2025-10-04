// API Gateway Service - Frontend service for API Gateway + Lambda architecture
class APIGatewayService {
  constructor() {
    // API Gateway endpoints
    this.authApiUrl = process.env.REACT_APP_AUTH_API_URL || 'https://4duhmwypm2.execute-api.us-east-1.amazonaws.com/dev';
    this.dataApiUrl = process.env.REACT_APP_DATA_API_URL || 'https://4duhmwypm2.execute-api.us-east-1.amazonaws.com/dev';
  }

  // Authentication methods
  async login(username, password) {
    try {
      const response = await fetch(`${this.authApiUrl}/auth/login`, {
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
    try {
      const response = await fetch(`${this.authApiUrl}/auth/logout`, {
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
    try {
      const response = await fetch(`${this.authApiUrl}/auth/me`, {
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
