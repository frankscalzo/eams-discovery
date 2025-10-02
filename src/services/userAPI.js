import { USER_TYPES } from '../constants/userTypes';

// Mock user data - in production this would connect to DynamoDB
const mockUsers = [
  {
    id: '1',
    username: 'fscalzo',
    email: 'fscalzo@optimumhit.com',
    firstName: 'Frank',
    lastName: 'Scalzo',
    userType: USER_TYPES.ADMIN,
    assignedProjects: [],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    lastLogin: '2024-09-29T02:00:00Z'
  },
  {
    id: '2',
    username: 'admin',
    email: 'admin@optimumhit.com',
    firstName: 'System',
    lastName: 'Administrator',
    userType: USER_TYPES.ADMIN,
    assignedProjects: [],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    lastLogin: '2024-09-28T15:30:00Z'
  }
];

class UserAPI {
  // Get all users
  async getUsers() {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        users: mockUsers,
        total: mockUsers.length
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return {
        success: false,
        error: error.message,
        users: [],
        total: 0
      };
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const user = mockUsers.find(u => u.id === userId);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true,
        user
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create new user
  async createUser(userData) {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Generate new user ID
      const newId = (mockUsers.length + 1).toString();
      
      // Create user object
      const newUser = {
        id: newId,
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        userType: userData.userType,
        assignedProjects: userData.assignedProjects || [],
        isActive: userData.isActive !== false,
        createdAt: new Date().toISOString(),
        lastLogin: null
      };

      // Add to mock data
      mockUsers.push(newUser);

      return {
        success: true,
        user: newUser
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update user
  async updateUser(userId, userData) {
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const userIndex = mockUsers.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Update user
      mockUsers[userIndex] = {
        ...mockUsers[userIndex],
        ...userData,
        id: userId // Ensure ID doesn't change
      };

      return {
        success: true,
        user: mockUsers[userIndex]
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete user
  async deleteUser(userId) {
    try {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const userIndex = mockUsers.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Remove user
      const deletedUser = mockUsers.splice(userIndex, 1)[0];

      return {
        success: true,
        user: deletedUser
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Assign projects to user
  async assignProjectsToUser(userId, projectIds) {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const userIndex = mockUsers.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Update assigned projects
      mockUsers[userIndex].assignedProjects = projectIds;

      return {
        success: true,
        user: mockUsers[userIndex]
      };
    } catch (error) {
      console.error('Error assigning projects:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get users by project
  async getUsersByProject(projectId) {
    try {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const projectUsers = mockUsers.filter(user => 
        user.assignedProjects.includes(projectId) || 
        user.userType === USER_TYPES.INTERNAL || 
        user.userType === USER_TYPES.ADMIN
      );

      return {
        success: true,
        users: projectUsers,
        total: projectUsers.length
      };
    } catch (error) {
      console.error('Error fetching project users:', error);
      return {
        success: false,
        error: error.message,
        users: [],
        total: 0
      };
    }
  }

  // Search users
  async searchUsers(query) {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const searchTerm = query.toLowerCase();
      const filteredUsers = mockUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.firstName.toLowerCase().includes(searchTerm) ||
        user.lastName.toLowerCase().includes(searchTerm)
      );

      return {
        success: true,
        users: filteredUsers,
        total: filteredUsers.length
      };
    } catch (error) {
      console.error('Error searching users:', error);
      return {
        success: false,
        error: error.message,
        users: [],
        total: 0
      };
    }
  }
}

export default new UserAPI();
