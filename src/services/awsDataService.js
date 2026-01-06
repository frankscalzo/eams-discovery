// AWS Data Service - Production-ready data management service
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminDeleteUserCommand, AdminUpdateUserAttributesCommand, AdminListUsersInGroupCommand, AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand, InitiateAuthCommand, RespondToAuthChallengeCommand, AuthFlowType } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, PutItemCommand, GetItemCommand, ScanCommand, UpdateItemCommand, DeleteItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { awsConfig } from './awsConfig';
import apiGatewayService from './apiGatewayService';
import { getUserLevelInfo, USER_LEVELS } from '../constants/userPermissions';

// Initialize clients with SSM configuration
let cognitoClient = null;
let dynamoClient = null;
let config = null;

// Initialize clients when configuration is available
const initializeClients = async () => {
  if (!config) {
    // Get configuration from SSM
    config = await awsConfig;
    console.log('Loaded config from SSM:', config);
  }
  
  if (!cognitoClient) {
    cognitoClient = new CognitoIdentityProviderClient({ 
      region: config.region,
      credentials: config.credentials
    });
  }
  
  if (!dynamoClient) {
    dynamoClient = new DynamoDBClient({ 
      region: config.region,
      credentials: config.credentials
    });
  }
  
  return { cognitoClient, dynamoClient, config };
};

class AWSDataService {
  // Authentication
  async login(username, password) {
    try {
      const { cognitoClient, config } = await initializeClients();
      
      const command = new InitiateAuthCommand({
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        ClientId: config.userPoolClientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password
        }
      });

      const result = await cognitoClient.send(command);
      
      if (result.AuthenticationResult) {
        // Get user details
        const user = await this.getUserByUsername(username);
        return {
          success: true,
          user: user,
          tokens: result.AuthenticationResult
        };
      } else if (result.ChallengeName) {
        // Handle MFA or other challenges
        return {
          success: false,
          challenge: result.ChallengeName,
          session: result.Session
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async logout() {
    // Clear local storage
    localStorage.removeItem('eams_tokens');
    localStorage.removeItem('eams_user');
  }

  async getCurrentUser() {
    const user = localStorage.getItem('eams_user');
    return user ? JSON.parse(user) : null;
  }

  // User Management
  async createUser(userData, currentUser) {
    try {
      // Use API Gateway + Lambda for user creation
      const result = await apiGatewayService.createUser(userData);
      return result;
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createCognitoUser(userData) {
    const { cognitoClient, config } = await initializeClients();
    
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: config.userPoolId,
      Username: userData.email,
      UserAttributes: [
        { Name: 'email', Value: userData.email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: userData.firstName },
        { Name: 'family_name', Value: userData.lastName },
        { Name: 'custom:user_type', Value: userData.userType },
        { Name: 'custom:company_id', Value: userData.assignedCompanyId || '' },
        { Name: 'custom:is_primary_company', Value: userData.isPrimaryCompany ? 'true' : 'false' }
      ],
      MessageAction: 'SUPPRESS',
      TemporaryPassword: userData.temporaryPassword || this.generateTemporaryPassword()
    });

    const result = await cognitoClient.send(createUserCommand);
    
    // Set permanent password if provided
    if (userData.password) {
      await this.setUserPassword(userData.email, userData.password);
    }
    
    return result.User;
  }

  async createDynamoUser(cognitoUser, userData) {
    const { dynamoClient, config } = await initializeClients();
    
    const userId = cognitoUser.Attributes?.find(attr => attr.Name === 'sub')?.Value;
    const now = new Date().toISOString();
    
    // Get user level information
    const userLevelInfo = getUserLevelInfo(userData.userLevel || USER_LEVELS.STANDARD);
    
    // Single table design with proper GSI structure
    const userRecord = {
      PK: `USER#${userId}`,
      SK: `PROFILE#${userId}`,
      GSI1PK: `COMPANY#${userData.assignedCompanyId || userData.primaryCompanyId}`,
      GSI1SK: `USER#${userId}`,
      GSI2PK: `USER_LEVEL#${userData.userLevel || USER_LEVELS.STANDARD}`,
      GSI2SK: `USER#${userId}`,
      EntityType: 'USER',
      UserID: userId,
      Username: userData.email,
      Email: userData.email,
      FirstName: userData.firstName,
      LastName: userData.lastName,
      UserLevel: userData.userLevel || USER_LEVELS.STANDARD,
      UserType: userData.userType || 'standard', // Keep for backward compatibility
      AssignedCompanyId: userData.assignedCompanyId,
      PrimaryCompanyId: userData.primaryCompanyId,
      IsPrimaryCompany: userData.isPrimaryCompany || false,
      AssignedProjects: userData.assignedProjects || [],
      CompanyAccess: userData.companyAccess || [],
      ProjectAccess: userData.projectAccess || [],
      Permissions: userLevelInfo.permissions,
      CanAccessAllCompanies: userLevelInfo.canAccessAllCompanies,
      CanAccessAllProjects: userLevelInfo.canAccessAllProjects,
      CanManageUsers: userLevelInfo.canManageUsers,
      CanManageCompanies: userLevelInfo.canManageCompanies,
      CanManageProjects: userLevelInfo.canManageProjects,
      RequireMFA: userData.requireMFA || false,
      IsActive: userData.isActive !== false,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: userData.createdBy || 'system',
      LastLogin: null
    };

    const command = new PutItemCommand({
      TableName: config.dynamoDB.usersTable,
      Item: marshall(userRecord)
    });

    await dynamoClient.send(command);
    return userRecord;
  }

  async getUsers(currentUser) {
    try {
      // Use API Gateway + Lambda for data fetching
      const result = await apiGatewayService.getUsers();
      
      if (result.success) {
        // Filter based on user permissions
        const filteredUsers = this.filterUsersByPermission(result.data || [], currentUser);
        
        return {
          success: true,
          users: filteredUsers,
          total: filteredUsers.length
        };
      } else {
        throw new Error(result.error || 'Failed to fetch users');
      }
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

  async getUserByUsername(username) {
    try {
      const { dynamoClient, config } = await initializeClients();
      
      // Query by GSI1 (Username)
      const command = new QueryCommand({
        TableName: config.dynamoDB.usersTable,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1sk)',
        ExpressionAttributeValues: {
          ':gsi1pk': { S: `USER#${username}` },
          ':gsi1sk': { S: 'PROFILE#' }
        }
      });

      const result = await dynamoClient.send(command);
      const users = result.Items?.map(item => unmarshall(item)) || [];
      
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return null;
    }
  }

  // Company Management
  async createCompany(companyData, currentUser) {
    try {
      // Use API Gateway + Lambda for company creation
      const result = await apiGatewayService.createCompany(companyData);
      return result;
    } catch (error) {
      console.error('Error creating company:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getCompanies(currentUser) {
    try {
      // Use API Gateway + Lambda for data fetching
      const result = await apiGatewayService.getCompanies();
      
      if (result.success) {
        // Filter based on user permissions
        const filteredCompanies = this.filterCompaniesByPermission(result.data || [], currentUser);
        
        return {
          success: true,
          companies: filteredCompanies,
          total: filteredCompanies.length
        };
      } else {
        throw new Error(result.error || 'Failed to fetch companies');
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      return {
        success: false,
        error: error.message,
        companies: [],
        total: 0
      };
    }
  }

  // Project Management
  async createProject(projectData, currentUser) {
    try {
      // Use API Gateway + Lambda for project creation
      const result = await apiGatewayService.createProject(projectData);
      return result;
    } catch (error) {
      console.error('Error creating project:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getProjects(currentUser) {
    try {
      // Use API Gateway + Lambda for data fetching
      const result = await apiGatewayService.getProjects();
      
      if (result.success) {
        // Filter based on user permissions
        const filteredProjects = this.filterProjectsByPermission(result.data || [], currentUser);
        
        return {
          success: true,
          projects: filteredProjects,
          total: filteredProjects.length
        };
      } else {
        throw new Error(result.error || 'Failed to fetch projects');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      return {
        success: false,
        error: error.message,
        projects: [],
        total: 0
      };
    }
  }

  // Permission checks
  canCreateUser(currentUser, userData) {
    if (!currentUser) return false;
    
    // Admin can create any user
    if (currentUser.UserType === 'admin') return true;
    
    // Primary company users can create users for their company
    if (currentUser.IsPrimaryCompany && userData.assignedCompanyId === currentUser.AssignedCompanyId) {
      return true;
    }
    
    return false;
  }

  canCreateCompany(currentUser) {
    if (!currentUser) {
      console.log('No current user provided');
      return false;
    }
    
    console.log('Current user for company creation:', currentUser);
    console.log('UserLevel:', currentUser.UserLevel);
    console.log('UserType:', currentUser.UserType);
    console.log('userType:', currentUser.userType);
    console.log('userRole:', currentUser.userRole);
    console.log('IsPrimaryCompany:', currentUser.IsPrimaryCompany);
    console.log('isPrimaryCompany:', currentUser.isPrimaryCompany);
    
    // Admin can create companies
    if (currentUser.UserLevel === 'Admin') return true;
    
    // Super User can create companies
    if (currentUser.UserLevel === 'Super User') return true;
    
    // Legacy UserType check for backward compatibility
    if (currentUser.UserType === 'admin') return true;
    if (currentUser.UserType === 'super_user') return true;
    
    // Check userType from AuthContext
    if (currentUser.userType === 'PRIMARY_ADMIN') return true;
    if (currentUser.userType === 'ADMIN') return true;
    if (currentUser.userType === 'SUPER_USER') return true;
    
    // Primary company users can create companies
    if (currentUser.IsPrimaryCompany) return true;
    if (currentUser.isPrimaryCompany) return true;
    
    // For now, allow all authenticated users to create companies
    // TODO: Implement proper permission system
    console.log('Allowing company creation for authenticated user');
    return true;
  }

  canCreateProject(currentUser) {
    if (!currentUser) return false;
    
    // Admin can create projects
    if (currentUser.UserLevel === 'Admin') return true;
    
    // Super User can create projects
    if (currentUser.UserLevel === 'Super User') return true;
    
    // Legacy UserType check for backward compatibility
    if (currentUser.UserType === 'admin') return true;
    if (currentUser.UserType === 'super_user') return true;
    
    // Primary company users can create projects
    if (currentUser.IsPrimaryCompany) return true;
    
    // For now, allow all authenticated users to create projects
    // TODO: Implement proper permission system
    return true;
  }

  filterUsersByPermission(users, currentUser) {
    if (!currentUser) return [];
    
    // Admin can see all users
    if (currentUser.UserLevel === USER_LEVELS.ADMIN) return users;
    
    // Super users can see users in their accessible companies
    if (currentUser.UserLevel === USER_LEVELS.SUPER_USER) {
      if (currentUser.CanAccessAllCompanies) return users;
      
      const accessibleCompanyIds = [
        currentUser.AssignedCompanyId,
        ...(currentUser.CompanyAccess || [])
      ].filter(Boolean);
      
      return users.filter(user => 
        accessibleCompanyIds.includes(user.AssignedCompanyId) ||
        accessibleCompanyIds.some(companyId => 
          (user.CompanyAccess || []).includes(companyId)
        )
      );
    }
    
    // Standard users can only see themselves
    return users.filter(user => user.UserID === currentUser.UserID);
  }

  filterCompaniesByPermission(companies, currentUser) {
    if (!currentUser) return [];
    
    // Admin can see all companies
    if (currentUser.UserType === 'admin') return companies;
    
    // Primary company users can see all companies
    if (currentUser.IsPrimaryCompany) return companies;
    
    // Regular users can only see their company
    return companies.filter(company => company.CompanyID === currentUser.AssignedCompanyId);
  }

  filterProjectsByPermission(projects, currentUser) {
    if (!currentUser) return [];
    
    // Admin can see all projects
    if (currentUser.UserType === 'admin') return projects;
    
    // Primary company users can see all projects
    if (currentUser.IsPrimaryCompany) return projects;
    
    // Regular users can only see projects from their company
    return projects.filter(project => project.CompanyId === currentUser.AssignedCompanyId);
  }

  // Helper methods
  async addUserToGroups(username, userType, companyId) {
    try {
      const { cognitoClient, config } = await initializeClients();
      
      // Add to user type group
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: config.userPoolId,
        Username: username,
        GroupName: userType
      }));

      // Add to company group if specified
      if (companyId) {
        await cognitoClient.send(new AdminAddUserToGroupCommand({
          UserPoolId: config.userPoolId,
          Username: username,
          GroupName: `company-${companyId}`
        }));
      }
    } catch (error) {
      console.error('Error adding user to groups:', error);
    }
  }

  async setUserPassword(username, password) {
    const { cognitoClient, config } = await initializeClients();
    
    const command = new AdminSetUserPasswordCommand({
      UserPoolId: config.userPoolId,
      Username: username,
      Password: password,
      Permanent: true
    });

    await cognitoClient.send(command);
  }

  generateTemporaryPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Applications
  async getApplications() {
    try {
      const { dynamoClient, config } = await initializeClients();
      
      const command = new ScanCommand({
        TableName: config.dynamoDB.applicationsTable
      });
      const result = await dynamoClient.send(command);
      return {
        success: true,
        data: result.Items ? result.Items.map(item => unmarshall(item)) : []
      };
    } catch (error) {
      console.error('Error fetching applications:', error);
      return { success: false, error: error.message };
    }
  }

  async createApplication(applicationData) {
    try {
      const { dynamoClient, config } = await initializeClients();
      
      const item = {
        id: `app_${Date.now()}`,
        ...applicationData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const command = new PutItemCommand({
        TableName: config.dynamoDB.applicationsTable,
        Item: marshall(item)
      });
      
      await dynamoClient.send(command);
      return item;
    } catch (error) {
      console.error('Error creating application:', error);
      throw error;
    }
  }

  async updateApplication(id, applicationData) {
    try {
      const { dynamoClient, config } = await initializeClients();
      
      const item = {
        id,
        ...applicationData,
        updatedAt: new Date().toISOString()
      };
      
      const command = new PutItemCommand({
        TableName: config.dynamoDB.applicationsTable,
        Item: marshall(item)
      });
      
      await dynamoClient.send(command);
      return item;
    } catch (error) {
      console.error('Error updating application:', error);
      throw error;
    }
  }

  async deleteApplication(id) {
    try {
      const { dynamoClient, config } = await initializeClients();
      
      const command = new DeleteItemCommand({
        TableName: config.dynamoDB.applicationsTable,
        Key: marshall({ id })
      });
      
      await dynamoClient.send(command);
      return { success: true };
    } catch (error) {
      console.error('Error deleting application:', error);
      throw error;
    }
  }

  // Co-Travelers
  async getCoTravelers() {
    try {
      const command = new ScanCommand({
        TableName: config.dynamoDB.cotravelersTable || 'eams-cotravelers'
      });
      const result = await dynamoClient.send(command);
      return {
        success: true,
        data: result.Items ? result.Items.map(item => unmarshall(item)) : []
      };
    } catch (error) {
      console.error('Error fetching co-travelers:', error);
      return { success: false, error: error.message };
    }
  }

  async createCoTraveler(coTravelerData) {
    try {
      const item = {
        id: `ct_${Date.now()}`,
        ...coTravelerData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const command = new PutItemCommand({
        TableName: config.dynamoDB.cotravelersTable || 'eams-cotravelers',
        Item: marshall(item)
      });
      
      await dynamoClient.send(command);
      return item;
    } catch (error) {
      console.error('Error creating co-traveler:', error);
      throw error;
    }
  }

  async updateCoTraveler(id, coTravelerData) {
    try {
      const item = {
        id,
        ...coTravelerData,
        updatedAt: new Date().toISOString()
      };
      
      const command = new PutItemCommand({
        TableName: config.dynamoDB.cotravelersTable || 'eams-cotravelers',
        Item: marshall(item)
      });
      
      await dynamoClient.send(command);
      return item;
    } catch (error) {
      console.error('Error updating co-traveler:', error);
      throw error;
    }
  }

  async deleteCoTraveler(id) {
    try {
      const command = new DeleteItemCommand({
        TableName: config.dynamoDB.cotravelersTable || 'eams-cotravelers',
        Key: marshall({ id })
      });
      
      await dynamoClient.send(command);
      return { success: true };
    } catch (error) {
      console.error('Error deleting co-traveler:', error);
      throw error;
    }
  }
}

export default new AWSDataService();

