// AWS Data Service - Production-ready data management
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminDeleteUserCommand, AdminUpdateUserAttributesCommand, AdminListUsersInGroupCommand, AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand, InitiateAuthCommand, RespondToAuthChallengeCommand, AuthFlowType } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, PutItemCommand, GetItemCommand, ScanCommand, UpdateItemCommand, DeleteItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

// AWS Configuration
const REGION = process.env.REACT_APP_AWS_REGION || 'us-east-1';
const USER_POOL_ID = process.env.REACT_APP_USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.REACT_APP_USER_POOL_CLIENT_ID;
const IDENTITY_POOL_ID = process.env.REACT_APP_IDENTITY_POOL_ID;
const USERS_TABLE = process.env.REACT_APP_DYNAMODB_USERS_TABLE;
const COMPANIES_TABLE = process.env.REACT_APP_DYNAMODB_COMPANIES_TABLE;
const PROJECTS_TABLE = process.env.REACT_APP_DYNAMODB_PROJECTS_TABLE;
const APPLICATIONS_TABLE = process.env.REACT_APP_DYNAMODB_APPLICATIONS_TABLE;

// Initialize clients
const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });
const dynamoClient = new DynamoDBClient({ region: REGION });

class AWSDataService {
  // Authentication
  async login(username, password) {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        ClientId: USER_POOL_CLIENT_ID,
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
      // Validate permissions
      if (!this.canCreateUser(currentUser, userData)) {
        throw new Error('Insufficient permissions to create this user type');
      }

      // Create user in Cognito
      const cognitoUser = await this.createCognitoUser(userData);
      
      // Create user record in DynamoDB
      const dynamoUser = await this.createDynamoUser(cognitoUser, userData);
      
      // Add user to appropriate Cognito groups
      await this.addUserToGroups(cognitoUser.Username, userData.userType, userData.assignedCompanyId);
      
      return {
        success: true,
        user: {
          ...dynamoUser,
          cognitoUsername: cognitoUser.Username,
          cognitoSub: cognitoUser.Attributes?.find(attr => attr.Name === 'sub')?.Value
        }
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createCognitoUser(userData) {
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
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
    const userId = cognitoUser.Attributes?.find(attr => attr.Name === 'sub')?.Value;
    const now = new Date().toISOString();
    
    const userRecord = {
      PK: `USER#${userId}`,
      SK: `PROFILE#${userId}`,
      GSI1PK: `COMPANY#${userData.assignedCompanyId}`,
      GSI1SK: `USER#${userId}`,
      UserID: userId,
      Username: userData.email,
      Email: userData.email,
      FirstName: userData.firstName,
      LastName: userData.lastName,
      UserType: userData.userType,
      AssignedCompanyId: userData.assignedCompanyId,
      PrimaryCompanyId: userData.primaryCompanyId,
      IsPrimaryCompany: userData.isPrimaryCompany || false,
      AssignedProjects: userData.assignedProjects || [],
      CompanyAccess: userData.companyAccess || [],
      RequireMFA: userData.requireMFA || false,
      IsActive: userData.isActive !== false,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: userData.createdBy || 'system',
      LastLogin: null
    };

    const command = new PutItemCommand({
      TableName: USERS_TABLE,
      Item: marshall(userRecord)
    });

    await dynamoClient.send(command);
    return userRecord;
  }

  async getUsers(currentUser) {
    try {
      const command = new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: 'begins_with(PK, :pk)',
        ExpressionAttributeValues: {
          ':pk': { S: 'USER#' }
        }
      });

      const result = await dynamoClient.send(command);
      const users = result.Items?.map(item => unmarshall(item)) || [];

      // Filter based on user permissions
      const filteredUsers = this.filterUsersByPermission(users, currentUser);

      return {
        success: true,
        users: filteredUsers,
        total: filteredUsers.length
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

  async getUserByUsername(username) {
    try {
      // Query by GSI1 (Username)
      const command = new QueryCommand({
        TableName: USERS_TABLE,
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
      if (!this.canCreateCompany(currentUser)) {
        throw new Error('Insufficient permissions to create companies');
      }

      const companyId = `company_${Date.now()}`;
      const now = new Date().toISOString();
      
      const companyRecord = {
        PK: `COMPANY#${companyId}`,
        SK: `PROFILE#${companyId}`,
        CompanyID: companyId,
        Name: companyData.name,
        Type: companyData.type || 'client',
        Industry: companyData.industry || '',
        Size: companyData.size || 'Small',
        Location: companyData.location || '',
        ContactEmail: companyData.contactEmail,
        ContactPhone: companyData.contactPhone || '',
        Status: companyData.status || 'Active',
        CreatedAt: now,
        UpdatedAt: now,
        CreatedBy: currentUser?.UserID || 'system',
        Projects: []
      };

      const command = new PutItemCommand({
        TableName: COMPANIES_TABLE,
        Item: marshall(companyRecord)
      });

      await dynamoClient.send(command);
      
      return {
        success: true,
        company: companyRecord
      };
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
      const command = new ScanCommand({
        TableName: COMPANIES_TABLE,
        FilterExpression: 'begins_with(PK, :pk)',
        ExpressionAttributeValues: {
          ':pk': { S: 'COMPANY#' }
        }
      });

      const result = await dynamoClient.send(command);
      const companies = result.Items?.map(item => unmarshall(item)) || [];

      // Filter based on user permissions
      const filteredCompanies = this.filterCompaniesByPermission(companies, currentUser);

      return {
        success: true,
        companies: filteredCompanies,
        total: filteredCompanies.length
      };
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
      if (!this.canCreateProject(currentUser)) {
        throw new Error('Insufficient permissions to create projects');
      }

      const projectId = `project_${Date.now()}`;
      const now = new Date().toISOString();
      
      const projectRecord = {
        PK: `PROJECT#${projectId}`,
        SK: `PROFILE#${projectId}`,
        GSI1PK: `COMPANY#${projectData.companyId}`,
        GSI1SK: `PROJECT#${projectId}`,
        ProjectID: projectId,
        Name: projectData.name,
        Description: projectData.description || '',
        CompanyId: projectData.companyId,
        Status: projectData.status || 'Planning',
        StartDate: projectData.startDate || '',
        EndDate: projectData.endDate || '',
        ProjectManager: projectData.projectManager || '',
        Budget: projectData.budget || 0,
        CreatedAt: now,
        UpdatedAt: now,
        CreatedBy: currentUser?.UserID || 'system',
        Applications: [],
        Contacts: [],
        Issues: [],
        DiscoveryQuestions: []
      };

      const command = new PutItemCommand({
        TableName: PROJECTS_TABLE,
        Item: marshall(projectRecord)
      });

      await dynamoClient.send(command);
      
      return {
        success: true,
        project: projectRecord
      };
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
      const command = new ScanCommand({
        TableName: PROJECTS_TABLE,
        FilterExpression: 'begins_with(PK, :pk)',
        ExpressionAttributeValues: {
          ':pk': { S: 'PROJECT#' }
        }
      });

      const result = await dynamoClient.send(command);
      const projects = result.Items?.map(item => unmarshall(item)) || [];

      // Filter based on user permissions
      const filteredProjects = this.filterProjectsByPermission(projects, currentUser);

      return {
        success: true,
        projects: filteredProjects,
        total: filteredProjects.length
      };
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
    if (!currentUser) return false;
    
    // Admin can create companies
    if (currentUser.UserType === 'admin') return true;
    
    // Primary company users can create companies
    if (currentUser.IsPrimaryCompany) return true;
    
    return false;
  }

  canCreateProject(currentUser) {
    if (!currentUser) return false;
    
    // Admin can create projects
    if (currentUser.UserType === 'admin') return true;
    
    // Primary company users can create projects
    if (currentUser.IsPrimaryCompany) return true;
    
    return false;
  }

  filterUsersByPermission(users, currentUser) {
    if (!currentUser) return [];
    
    // Admin can see all users
    if (currentUser.UserType === 'admin') return users;
    
    // Primary company users can see users from their company
    if (currentUser.IsPrimaryCompany) {
      return users.filter(user => user.AssignedCompanyId === currentUser.AssignedCompanyId);
    }
    
    // Regular users can only see themselves
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
      // Add to user type group
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        GroupName: userType
      }));

      // Add to company group if specified
      if (companyId) {
        await cognitoClient.send(new AdminAddUserToGroupCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
          GroupName: `company-${companyId}`
        }));
      }
    } catch (error) {
      console.error('Error adding user to groups:', error);
    }
  }

  async setUserPassword(username, password) {
    const command = new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
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
}

export default new AWSDataService();

