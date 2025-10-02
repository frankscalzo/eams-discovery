import { 
  CognitoIdentityProviderClient, 
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserCommand,
  AdminListUsersInGroupCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminGetUserCommand,
  AdminEnableUserCommand,
  AdminDisableUserCommand,
  AdminSetUserMFAPreferenceCommand,
  AdminSetUserPasswordCommand as SetPasswordCommand,
  AdminConfirmSignUpCommand,
  AdminResendConfirmationCodeCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AuthFlowType
} from '@aws-sdk/client-cognito-identity-provider';
import { 
  DynamoDBClient, 
  PutItemCommand, 
  GetItemCommand, 
  UpdateItemCommand, 
  DeleteItemCommand, 
  QueryCommand, 
  ScanCommand 
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { USER_TYPES, getUserTypeInfo, getAvailableUserTypes } from '../constants/userTypes';

const cognitoClient = new CognitoIdentityProviderClient({ 
  region: process.env.REACT_APP_AWS_REGION || 'us-east-1' 
});
const dynamoClient = new DynamoDBClient({ 
  region: process.env.REACT_APP_AWS_REGION || 'us-east-1' 
});

const USER_POOL_ID = process.env.REACT_APP_USER_POOL_ID;
const DYNAMODB_TABLE = process.env.REACT_APP_DYNAMODB_TABLE;

class EnhancedUserAPI {
  // Create a new user in both Cognito and DynamoDB
  async createUser(userData, currentUser) {
    try {
      const userInfo = getUserTypeInfo(userData.userType);
      
      // Validate user creation permissions
      const availableTypes = getAvailableUserTypes(currentUser);
      if (!availableTypes.includes(userData.userType)) {
        throw new Error('Insufficient permissions to create this user type');
      }

      // Create user in Cognito
      const cognitoUser = await this.createCognitoUser(userData);
      
      // Create user record in DynamoDB
      const dynamoUser = await this.createDynamoUser(cognitoUser, userData);
      
      // Add user to appropriate Cognito groups
      await this.addUserToGroups(cognitoUser.Username, userData.userType, userData.assignedCompanyId);
      
      // Set up MFA if required
      if (userData.requireMFA) {
        await this.enableMFA(cognitoUser.Username);
      }
      
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
    const userId = cognitoUser.Attributes?.find(attr => attr.Name === 'sub')?.Value || cognitoUser.Username;
    const userInfo = getUserTypeInfo(userData.userType);
    
    const userRecord = {
      PK: `USER#${userId}`,
      SK: `PROFILE`,
      GSI1PK: `COMPANY#${userData.assignedCompanyId || userData.primaryCompanyId}`,
      GSI1SK: `USER#${userId}`,
      GSI2PK: `USER_TYPE#${userData.userType}`,
      GSI2SK: `USER#${userId}`,
      EntityType: 'USER',
      UserID: userId,
      Username: userData.email,
      Email: userData.email,
      FirstName: userData.firstName,
      LastName: userData.lastName,
      UserType: userData.userType,
      AssignedCompanyId: userData.assignedCompanyId,
      PrimaryCompanyId: userData.primaryCompanyId,
      IsPrimaryCompany: userInfo.isPrimaryCompany,
      UserLevel: userInfo.level,
      CompanyAccess: userData.companyAccess || [],
      AssignedProjects: userData.assignedProjects || [],
      Permissions: userInfo.permissions,
      IsActive: true,
      RequireMFA: userData.requireMFA || false,
      MFAEnabled: false,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
      CreatedBy: userData.createdBy,
      LastLoginAt: null,
      LoginCount: 0
    };

    const putCommand = new PutItemCommand({
      TableName: DYNAMODB_TABLE,
      Item: marshall(userRecord)
    });

    await dynamoClient.send(putCommand);
    return userRecord;
  }

  // Add user to Cognito groups based on user type
  async addUserToGroups(username, userType, companyId) {
    const userInfo = getUserTypeInfo(userType);
    const groups = [];

    // Add primary company groups
    if (userInfo.isPrimaryCompany) {
      groups.push('primary-company-users');
      groups.push(`primary-${userInfo.level}-users`);
    } else {
      // Add company-specific groups
      groups.push('company-users');
      groups.push(`company-${userInfo.level}-users`);
      if (companyId) {
        groups.push(`company-${companyId}-users`);
      }
    }

    // Add user to each group
    for (const groupName of groups) {
      try {
        await this.addUserToGroup(username, groupName);
      } catch (error) {
        console.warn(`Failed to add user to group ${groupName}:`, error);
      }
    }
  }

  // Add user to a specific Cognito group
  async addUserToGroup(username, groupName) {
    const command = new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: groupName
    });

    await cognitoClient.send(command);
  }

  // Enable MFA for user
  async enableMFA(username) {
    const command = new AdminSetUserMFAPreferenceCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      SMSMfaSettings: {
        Enabled: true,
        PreferredMfa: true
      }
    });

    await cognitoClient.send(command);
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

  // Get all users with company filtering
  async getUsers(currentUser, filters = {}) {
    try {
      const userInfo = getUserTypeInfo(currentUser.userType);
      let users = [];

      if (userInfo.canAccessAllCompanies) {
        // Primary company users can see all users
        const scanCommand = new ScanCommand({
          TableName: DYNAMODB_TABLE,
          FilterExpression: 'EntityType = :entityType',
          ExpressionAttributeValues: {
            ':entityType': { S: 'USER' }
          }
        });

        const result = await dynamoClient.send(scanCommand);
        users = result.Items?.map(item => unmarshall(item)) || [];
      } else {
        // Company users can only see users in their company
        const queryCommand = new QueryCommand({
          TableName: DYNAMODB_TABLE,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :companyId',
          ExpressionAttributeValues: {
            ':companyId': { S: `COMPANY#${currentUser.assignedCompanyId || currentUser.primaryCompanyId}` }
          }
        });

        const result = await dynamoClient.send(queryCommand);
        users = result.Items?.map(item => unmarshall(item)) || [];
      }

      // Apply filters
      if (filters.userType) {
        users = users.filter(user => user.UserType === filters.userType);
      }
      if (filters.isActive !== undefined) {
        users = users.filter(user => user.IsActive === filters.isActive);
      }
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        users = users.filter(user => 
          user.FirstName?.toLowerCase().includes(searchTerm) ||
          user.LastName?.toLowerCase().includes(searchTerm) ||
          user.Email?.toLowerCase().includes(searchTerm)
        );
      }

      return {
        success: true,
        users: users.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt))
      };
    } catch (error) {
      console.error('Error getting users:', error);
      return {
        success: false,
        error: error.message,
        users: []
      };
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const command = new GetItemCommand({
        TableName: DYNAMODB_TABLE,
        Key: {
          PK: { S: `USER#${userId}` },
          SK: { S: 'PROFILE' }
        }
      });

      const result = await dynamoClient.send(command);
      if (!result.Item) {
        throw new Error('User not found');
      }

      return {
        success: true,
        user: unmarshall(result.Item)
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update user
  async updateUser(userId, userData, currentUser) {
    try {
      // Get current user data
      const currentUserData = await this.getUserById(userId);
      if (!currentUserData.success) {
        throw new Error('User not found');
      }

      const userInfo = getUserTypeInfo(userData.userType);
      
      // Update DynamoDB record
      const updateCommand = new UpdateItemCommand({
        TableName: DYNAMODB_TABLE,
        Key: {
          PK: { S: `USER#${userId}` },
          SK: { S: 'PROFILE' }
        },
        UpdateExpression: 'SET #firstName = :firstName, #lastName = :lastName, #userType = :userType, #assignedCompanyId = :assignedCompanyId, #companyAccess = :companyAccess, #assignedProjects = :assignedProjects, #isActive = :isActive, #requireMFA = :requireMFA, #updatedAt = :updatedAt, #updatedBy = :updatedBy',
        ExpressionAttributeNames: {
          '#firstName': 'FirstName',
          '#lastName': 'LastName',
          '#userType': 'UserType',
          '#assignedCompanyId': 'AssignedCompanyId',
          '#companyAccess': 'CompanyAccess',
          '#assignedProjects': 'AssignedProjects',
          '#isActive': 'IsActive',
          '#requireMFA': 'RequireMFA',
          '#updatedAt': 'UpdatedAt',
          '#updatedBy': 'UpdatedBy'
        },
        ExpressionAttributeValues: {
          ':firstName': { S: userData.firstName },
          ':lastName': { S: userData.lastName },
          ':userType': { S: userData.userType },
          ':assignedCompanyId': { S: userData.assignedCompanyId || '' },
          ':companyAccess': { L: (userData.companyAccess || []).map(access => ({ M: marshall(access) })) },
          ':assignedProjects': { L: (userData.assignedProjects || []).map(project => ({ S: project })) },
          ':isActive': { BOOL: userData.isActive },
          ':requireMFA': { BOOL: userData.requireMFA || false },
          ':updatedAt': { S: new Date().toISOString() },
          ':updatedBy': { S: currentUser.UserID }
        }
      });

      await dynamoClient.send(updateCommand);

      // Update Cognito attributes
      await this.updateCognitoUser(userData.email, userData);

      return {
        success: true,
        message: 'User updated successfully'
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update Cognito user attributes
  async updateCognitoUser(username, userData) {
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      UserAttributes: [
        { Name: 'given_name', Value: userData.firstName },
        { Name: 'family_name', Value: userData.lastName },
        { Name: 'custom:user_type', Value: userData.userType },
        { Name: 'custom:company_id', Value: userData.assignedCompanyId || '' },
        { Name: 'custom:is_primary_company', Value: userData.isPrimaryCompany ? 'true' : 'false' }
      ]
    });

    await cognitoClient.send(command);
  }

  // Delete user
  async deleteUser(userId, currentUser) {
    try {
      // Get user data
      const userData = await this.getUserById(userId);
      if (!userData.success) {
        throw new Error('User not found');
      }

      const user = userData.user;

      // Delete from DynamoDB
      const deleteCommand = new DeleteItemCommand({
        TableName: DYNAMODB_TABLE,
        Key: {
          PK: { S: `USER#${userId}` },
          SK: { S: 'PROFILE' }
        }
      });

      await dynamoClient.send(deleteCommand);

      // Delete from Cognito
      const cognitoDeleteCommand = new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: user.Username
      });

      await cognitoClient.send(cognitoDeleteCommand);

      return {
        success: true,
        message: 'User deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Enable/Disable user
  async toggleUserStatus(userId, isActive) {
    try {
      // Update DynamoDB
      const updateCommand = new UpdateItemCommand({
        TableName: DYNAMODB_TABLE,
        Key: {
          PK: { S: `USER#${userId}` },
          SK: { S: 'PROFILE' }
        },
        UpdateExpression: 'SET #isActive = :isActive, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#isActive': 'IsActive',
          '#updatedAt': 'UpdatedAt'
        },
        ExpressionAttributeValues: {
          ':isActive': { BOOL: isActive },
          ':updatedAt': { S: new Date().toISOString() }
        }
      });

      await dynamoClient.send(updateCommand);

      // Update Cognito
      const cognitoCommand = isActive ? 
        new AdminEnableUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: userId
        }) :
        new AdminDisableUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: userId
        });

      await cognitoClient.send(cognitoCommand);

      return {
        success: true,
        message: `User ${isActive ? 'enabled' : 'disabled'} successfully`
      };
    } catch (error) {
      console.error('Error toggling user status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Reset user password
  async resetUserPassword(username, newPassword) {
    try {
      const command = new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        Password: newPassword,
        Permanent: true
      });

      await cognitoClient.send(command);

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      console.error('Error resetting password:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get companies for user assignment
  async getCompaniesForAssignment(currentUser) {
    try {
      // This would typically come from a companies API
      // For now, return mock data or implement based on your company structure
      return {
        success: true,
        companies: [
          { id: 'primary-company', name: 'Primary Company', isPrimary: true },
          { id: 'company-1', name: 'Company 1', isPrimary: false },
          { id: 'company-2', name: 'Company 2', isPrimary: false }
        ]
      };
    } catch (error) {
      console.error('Error getting companies:', error);
      return {
        success: false,
        error: error.message,
        companies: []
      };
    }
  }
}

export default new EnhancedUserAPI();

