import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoConfig } from './awsConfig';

const client = new DynamoDBClient(dynamoConfig);
const docClient = DynamoDBDocumentClient.from(client);

// Table names
const PROJECTS_TABLE = 'EAMS-Projects';
const APPLICATIONS_TABLE = 'EAMS-Applications';
const RUNBOOKS_TABLE = 'EAMS-Runbooks';
const CONTACTS_TABLE = 'EAMS-Contacts';
const ISSUES_TABLE = 'EAMS-Issues';
const DISCOVERY_QUESTIONS_TABLE = 'EAMS-DiscoveryQuestions';

export class ProjectDiscoveryAPI {
  // Project Management
  static async createProject(projectData) {
    const project = {
      projectId: projectData.projectId || `proj_${Date.now()}`,
      projectName: projectData.projectName,
      companyName: projectData.companyName,
      projectType: projectData.projectType || 'Epic Migration',
      status: projectData.status || 'Planning',
      description: projectData.description,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      cutoverDate: projectData.cutoverDate,
      projectManager: projectData.projectManager,
      applicationManager: projectData.applicationManager,
      infrastructureManager: projectData.infrastructureManager,
      conferenceCallNumber: projectData.conferenceCallNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: projectData.createdBy,
      companyId: projectData.companyId,
      // Clone information
      clonedFrom: projectData.clonedFrom || null,
      isClone: projectData.isClone || false,
      // Discovery data
      discoveryPhase: projectData.discoveryPhase || 'Initial',
      totalApplications: 0,
      testableApplications: 0,
      passedApplications: 0,
      failedApplications: 0,
      // Searchable content
      searchableContent: this.generateSearchableContent(projectData)
    };

    const command = new PutCommand({
      TableName: PROJECTS_TABLE,
      Item: project
    });

    await docClient.send(command);
    return project;
  }

  static async getProject(projectId) {
    const command = new GetCommand({
      TableName: PROJECTS_TABLE,
      Key: { projectId }
    });

    const result = await docClient.send(command);
    return result.Item;
  }

  static async getAllProjects(companyId = null) {
    const command = new ScanCommand({
      TableName: PROJECTS_TABLE,
      ...(companyId && {
        FilterExpression: 'companyId = :companyId',
        ExpressionAttributeValues: { ':companyId': companyId }
      })
    });

    const result = await docClient.send(command);
    return result.Items || [];
  }

  static async updateProject(projectId, updates) {
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updates).forEach((key, index) => {
      if (updates[key] !== undefined) {
        updateExpression.push(`#key${index} = :val${index}`);
        expressionAttributeNames[`#key${index}`] = key;
        expressionAttributeValues[`:val${index}`] = updates[key];
      }
    });

    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: PROJECTS_TABLE,
      Key: { projectId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    const result = await docClient.send(command);
    return result.Attributes;
  }

  static async cloneProject(originalProjectId, newProjectData) {
    const originalProject = await this.getProject(originalProjectId);
    if (!originalProject) {
      throw new Error('Original project not found');
    }

    // Create new project based on original
    const clonedProject = {
      ...originalProject,
      projectId: `proj_${Date.now()}`,
      projectName: newProjectData.projectName || `${originalProject.projectName} - Clone`,
      status: 'Planning',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clonedFrom: originalProjectId,
      isClone: true,
      // Reset testing data
      totalApplications: 0,
      testableApplications: 0,
      passedApplications: 0,
      failedApplications: 0
    };

    delete clonedProject.createdAt;
    delete clonedProject.updatedAt;

    return await this.createProject(clonedProject);
  }

  // Application Management
  static async createApplication(applicationData) {
    const application = {
      applicationId: applicationData.applicationId || `app_${Date.now()}`,
      projectId: applicationData.projectId,
      applicationName: applicationData.applicationName,
      vendor: applicationData.vendor,
      systemVendor: applicationData.systemVendor,
      testingMethod: applicationData.testingMethod,
      manager: applicationData.manager,
      taskOwner: applicationData.taskOwner,
      team: applicationData.team,
      flow: applicationData.flow,
      tstDryRunCapable: applicationData.tstDryRunCapable || false,
      nonProdDryRun1Status: applicationData.nonProdDryRun1Status || 'Not Tested',
      nonProdDryRun2Status: applicationData.nonProdDryRun2Status || 'Not Tested',
      emergencyValid: applicationData.emergencyValid || false,
      cloudProdSmokeTestStatus: applicationData.cloudProdSmokeTestStatus || 'Not Tested',
      criticality: applicationData.criticality || 0,
      corepointIc: applicationData.corepointIc || false,
      taskNotes: applicationData.taskNotes || '',
      cutoverDuringTesting: applicationData.cutoverDuringTesting || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Searchable content
      searchableContent: this.generateApplicationSearchableContent(applicationData)
    };

    const command = new PutCommand({
      TableName: APPLICATIONS_TABLE,
      Item: application
    });

    await docClient.send(command);
    return application;
  }

  static async getApplicationsByProject(projectId) {
    const command = new QueryCommand({
      TableName: APPLICATIONS_TABLE,
      IndexName: 'ProjectIdIndex',
      KeyConditionExpression: 'projectId = :projectId',
      ExpressionAttributeValues: { ':projectId': projectId }
    });

    const result = await docClient.send(command);
    return result.Items || [];
  }

  static async updateApplicationStatus(applicationId, statusUpdates) {
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(statusUpdates).forEach((key, index) => {
      if (statusUpdates[key] !== undefined) {
        updateExpression.push(`#key${index} = :val${index}`);
        expressionAttributeNames[`#key${index}`] = key;
        expressionAttributeValues[`:val${index}`] = statusUpdates[key];
      }
    });

    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: APPLICATIONS_TABLE,
      Key: { applicationId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    const result = await docClient.send(command);
    return result.Attributes;
  }

  // Contact Management
  static async createContact(contactData) {
    const contact = {
      contactId: contactData.contactId || `contact_${Date.now()}`,
      projectId: contactData.projectId,
      organization: contactData.organization,
      team: contactData.team,
      role: contactData.role,
      name: contactData.name,
      location: contactData.location,
      email: contactData.email,
      homePhone: contactData.homePhone,
      businessPhone: contactData.businessPhone,
      mobilePhone: contactData.mobilePhone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const command = new PutCommand({
      TableName: CONTACTS_TABLE,
      Item: contact
    });

    await docClient.send(command);
    return contact;
  }

  static async getContactsByProject(projectId) {
    const command = new QueryCommand({
      TableName: CONTACTS_TABLE,
      IndexName: 'ProjectIdIndex',
      KeyConditionExpression: 'projectId = :projectId',
      ExpressionAttributeValues: { ':projectId': projectId }
    });

    const result = await docClient.send(command);
    return result.Items || [];
  }

  // Issue Management
  static async createIssue(issueData) {
    const issue = {
      issueId: issueData.issueId || `issue_${Date.now()}`,
      projectId: issueData.projectId,
      issueNumber: issueData.issueNumber,
      dateRaised: issueData.dateRaised || new Date().toISOString(),
      timeRaised: issueData.timeRaised,
      raisedBy: issueData.raisedBy,
      issueOwner: issueData.issueOwner,
      runbookTaskId: issueData.runbookTaskId,
      issueSeverity: issueData.issueSeverity || 'Low',
      issueDescription: issueData.issueDescription,
      actionsTaken: issueData.actionsTaken || '',
      actionBy: issueData.actionBy,
      issueStatus: issueData.issueStatus || 'Open',
      dateClosed: issueData.dateClosed,
      timeClosed: issueData.timeClosed,
      closedBy: issueData.closedBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const command = new PutCommand({
      TableName: ISSUES_TABLE,
      Item: issue
    });

    await docClient.send(command);
    return issue;
  }

  static async getIssuesByProject(projectId) {
    const command = new QueryCommand({
      TableName: ISSUES_TABLE,
      IndexName: 'ProjectIdIndex',
      KeyConditionExpression: 'projectId = :projectId',
      ExpressionAttributeValues: { ':projectId': projectId }
    });

    const result = await docClient.send(command);
    return result.Items || [];
  }

  // Discovery Questions
  static async createDiscoveryQuestion(questionData) {
    const question = {
      questionId: questionData.questionId || `q_${Date.now()}`,
      projectId: questionData.projectId,
      category: questionData.category,
      question: questionData.question,
      answer: questionData.answer || '',
      required: questionData.required || false,
      answeredBy: questionData.answeredBy,
      answeredAt: questionData.answeredAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const command = new PutCommand({
      TableName: DISCOVERY_QUESTIONS_TABLE,
      Item: question
    });

    await docClient.send(command);
    return question;
  }

  static async getDiscoveryQuestionsByProject(projectId) {
    const command = new QueryCommand({
      TableName: DISCOVERY_QUESTIONS_TABLE,
      IndexName: 'ProjectIdIndex',
      KeyConditionExpression: 'projectId = :projectId',
      ExpressionAttributeValues: { ':projectId': projectId }
    });

    const result = await docClient.send(command);
    return result.Items || [];
  }

  // Search functionality
  static async searchProjects(searchTerm, companyId = null) {
    const command = new ScanCommand({
      TableName: PROJECTS_TABLE,
      FilterExpression: 'contains(searchableContent, :searchTerm)',
      ExpressionAttributeValues: { ':searchTerm': searchTerm.toLowerCase() },
      ...(companyId && {
        FilterExpression: 'contains(searchableContent, :searchTerm) AND companyId = :companyId',
        ExpressionAttributeValues: { 
          ':searchTerm': searchTerm.toLowerCase(),
          ':companyId': companyId
        }
      })
    });

    const result = await docClient.send(command);
    return result.Items || [];
  }

  static async searchApplications(searchTerm, projectId = null) {
    const command = new ScanCommand({
      TableName: APPLICATIONS_TABLE,
      FilterExpression: 'contains(searchableContent, :searchTerm)',
      ExpressionAttributeValues: { ':searchTerm': searchTerm.toLowerCase() },
      ...(projectId && {
        FilterExpression: 'contains(searchableContent, :searchTerm) AND projectId = :projectId',
        ExpressionAttributeValues: { 
          ':searchTerm': searchTerm.toLowerCase(),
          ':projectId': projectId
        }
      })
    });

    const result = await docClient.send(command);
    return result.Items || [];
  }

  // Helper methods
  static generateSearchableContent(projectData) {
    const content = [
      projectData.projectName,
      projectData.companyName,
      projectData.description,
      projectData.projectManager,
      projectData.applicationManager,
      projectData.infrastructureManager
    ].filter(Boolean).join(' ').toLowerCase();
    
    return content;
  }

  static generateApplicationSearchableContent(applicationData) {
    const content = [
      applicationData.applicationName,
      applicationData.vendor,
      applicationData.systemVendor,
      applicationData.manager,
      applicationData.taskOwner,
      applicationData.team,
      applicationData.taskNotes
    ].filter(Boolean).join(' ').toLowerCase();
    
    return content;
  }

  // File upload and data import
  static async importFromCSV(csvData, projectId, dataType) {
    const rows = csvData.split('\n').map(row => row.split(',').map(cell => cell.trim().replace(/"/g, '')));
    const headers = rows[0];
    const dataRows = rows.slice(1);

    const results = [];

    for (const row of dataRows) {
      if (row.length < headers.length) continue;

      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index];
      });

      try {
        let result;
        switch (dataType) {
          case 'applications':
            result = await this.createApplication({ ...rowData, projectId });
            break;
          case 'contacts':
            result = await this.createContact({ ...rowData, projectId });
            break;
          case 'issues':
            result = await this.createIssue({ ...rowData, projectId });
            break;
          case 'discovery-questions':
            result = await this.createDiscoveryQuestion({ ...rowData, projectId });
            break;
          default:
            throw new Error(`Unknown data type: ${dataType}`);
        }
        results.push(result);
      } catch (error) {
        console.error(`Error importing row:`, error);
        results.push({ error: error.message, rowData });
      }
    }

    return results;
  }
}

export default ProjectDiscoveryAPI;

