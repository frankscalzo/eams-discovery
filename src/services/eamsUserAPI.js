// EAMS User API - Identical to AWS Transfer Workspace pattern
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminDeleteUserCommand, AdminUpdateUserAttributesCommand, AdminListUsersInGroupCommand, AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, PutItemCommand, GetItemCommand, ScanCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

// AWS Configuration
const REGION = process.env.REACT_APP_AWS_REGION || 'us-east-1';
const USER_POOL_ID = process.env.REACT_APP_USER_POOL_ID;
const DYNAMODB_TABLE = process.env.REACT_APP_DYNAMODB_TABLE || 'eams-dev-users';

// Initialize clients
const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });
const dynamoClient = new DynamoDBClient({ region: REGION });

class EAMSUserAPI {
  // Create a new user in both Cognito and DynamoDB
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

  // Create user in Cognito
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
        { Name: 'custom:primary_company_id', Value: userData.primaryCompanyId || '' },
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

  // Create user record in DynamoDB
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
      TableName: DYNAMODB_TABLE,
      Item: marshall(userRecord)
    });

    await dynamoClient.send(command);
    return userRecord;
  }

  // Add user to Cognito groups
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

  // Set user password
  async setUserPassword(username, password) {
    const command = new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      Password: password,
      Permanent: true
    });

    await cognitoClient.send(command);
  }

  // Generate temporary password
  generateTemporaryPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Get all users
  async getUsers(currentUser) {
    try {
      const command = new ScanCommand({
        TableName: DYNAMODB_TABLE,
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

  // Get user by ID
  async getUserById(userId) {
    try {
      const command = new GetItemCommand({
        TableName: DYNAMODB_TABLE,
        Key: marshall({
          PK: `USER#${userId}`,
          SK: `PROFILE#${userId}`
        })
      });

      const result = await dynamoClient.send(command);
      
      if (!result.Item) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true,
        user: unmarshall(result.Item)
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update user
  async updateUser(userId, userData, currentUser) {
    try {
      if (!this.canUpdateUser(currentUser, userData)) {
        throw new Error('Insufficient permissions to update this user');
      }

      const now = new Date().toISOString();
      
      const updateExpression = 'SET UpdatedAt = :updatedAt';
      const expressionAttributeValues = {
        ':updatedAt': { S: now }
      };

      // Add fields to update
      if (userData.firstName) {
        updateExpression += ', FirstName = :firstName';
        expressionAttributeValues[':firstName'] = { S: userData.firstName };
      }
      if (userData.lastName) {
        updateExpression += ', LastName = :lastName';
        expressionAttributeValues[':lastName'] = { S: userData.lastName };
      }
      if (userData.userType) {
        updateExpression += ', UserType = :userType';
        expressionAttributeValues[':userType'] = { S: userData.userType };
      }
      if (userData.assignedCompanyId) {
        updateExpression += ', AssignedCompanyId = :assignedCompanyId, GSI1PK = :gsi1pk';
        expressionAttributeValues[':assignedCompanyId'] = { S: userData.assignedCompanyId };
        expressionAttributeValues[':gsi1pk'] = { S: `COMPANY#${userData.assignedCompanyId}` };
      }
      if (userData.assignedProjects) {
        updateExpression += ', AssignedProjects = :assignedProjects';
        expressionAttributeValues[':assignedProjects'] = { L: userData.assignedProjects.map(p => ({ S: p })) };
      }
      if (userData.isActive !== undefined) {
        updateExpression += ', IsActive = :isActive';
        expressionAttributeValues[':isActive'] = { BOOL: userData.isActive };
      }

      const command = new UpdateItemCommand({
        TableName: DYNAMODB_TABLE,
        Key: marshall({
          PK: `USER#${userId}`,
          SK: `PROFILE#${userId}`
        }),
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      });

      const result = await dynamoClient.send(command);
      
      return {
        success: true,
        user: unmarshall(result.Attributes)
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
  async deleteUser(userId, currentUser) {
    try {
      if (!this.canDeleteUser(currentUser)) {
        throw new Error('Insufficient permissions to delete users');
      }

      // Get user info first
      const userResult = await this.getUserById(userId);
      if (!userResult.success) {
        throw new Error('User not found');
      }

      const user = userResult.user;

      // Delete from Cognito
      await cognitoClient.send(new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: user.Username
      }));

      // Delete from DynamoDB
      const command = new DeleteItemCommand({
        TableName: DYNAMODB_TABLE,
        Key: marshall({
          PK: `USER#${userId}`,
          SK: `PROFILE#${userId}`
        })
      });

      await dynamoClient.send(command);

      return {
        success: true,
        user
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: error.message
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

  canUpdateUser(currentUser, userData) {
    if (!currentUser) return false;
    
    // Admin can update any user
    if (currentUser.UserType === 'admin') return true;
    
    // Users can update themselves (limited fields)
    if (currentUser.UserID === userData.userId) {
      return true;
    }
    
    return false;
  }

  canDeleteUser(currentUser) {
    if (!currentUser) return false;
    
    // Only admin can delete users
    return currentUser.UserType === 'admin';
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
}

export default new EAMSUserAPI();

