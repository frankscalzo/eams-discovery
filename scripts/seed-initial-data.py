#!/usr/bin/env python3
"""
Seed initial data for EAMS system
"""
import boto3
import json
import uuid
from datetime import datetime
import argparse

def create_primary_company(dynamodb, table_name):
    """Create the primary company"""
    company_id = 'primary-company'
    item = {
        'PK': f'COMPANY#{company_id}',
        'SK': f'PROFILE#{company_id}',
        'CompanyID': company_id,
        'Name': 'Primary Company',
        'Type': 'admin',
        'Industry': 'Technology',
        'Size': 'Enterprise',
        'Location': 'Global',
        'ContactEmail': 'admin@primary.com',
        'ContactPhone': '(555) 123-4567',
        'Status': 'Active',
        'CreatedAt': datetime.utcnow().isoformat(),
        'Projects': []
    }
    
    dynamodb.put_item(TableName=table_name, Item=item)
    print(f"✅ Created primary company: {company_id}")
    return company_id

def create_admin_user(dynamodb, table_name, company_id):
    """Create admin user"""
    user_id = str(uuid.uuid4())
    item = {
        'PK': f'USER#{user_id}',
        'SK': f'PROFILE#{user_id}',
        'GSI1PK': f'COMPANY#{company_id}',
        'GSI1SK': f'USER#{user_id}',
        'UserID': user_id,
        'Username': 'admin@eams.com',
        'Email': 'admin@eams.com',
        'FirstName': 'Admin',
        'LastName': 'User',
        'UserType': 'admin',
        'AssignedCompanyId': company_id,
        'PrimaryCompanyId': company_id,
        'IsPrimaryCompany': True,
        'AssignedProjects': [],
        'CompanyAccess': [company_id],
        'RequireMFA': False,
        'IsActive': True,
        'CreatedAt': datetime.utcnow().isoformat(),
        'CreatedBy': 'system',
        'LastLogin': None
    }
    
    dynamodb.put_item(TableName=table_name, Item=item)
    print(f"✅ Created admin user: {user_id}")
    return user_id

def create_sample_company(dynamodb, table_name):
    """Create a sample company"""
    company_id = f'company-{str(uuid.uuid4())[:8]}'
    item = {
        'PK': f'COMPANY#{company_id}',
        'SK': f'PROFILE#{company_id}',
        'CompanyID': company_id,
        'Name': 'Northeast Georgia Health System',
        'Type': 'client',
        'Industry': 'Healthcare',
        'Size': 'Large',
        'Location': 'Gainesville, GA',
        'ContactEmail': 'contact@nghs.com',
        'ContactPhone': '(770) 219-9000',
        'Status': 'Active',
        'CreatedAt': datetime.utcnow().isoformat(),
        'Projects': []
    }
    
    dynamodb.put_item(TableName=table_name, Item=item)
    print(f"✅ Created sample company: {company_id}")
    return company_id

def create_sample_project(dynamodb, table_name, company_id):
    """Create a sample project"""
    project_id = f'project-{str(uuid.uuid4())[:8]}'
    item = {
        'PK': f'PROJECT#{project_id}',
        'SK': f'PROFILE#{project_id}',
        'GSI1PK': f'COMPANY#{company_id}',
        'GSI1SK': f'PROJECT#{project_id}',
        'ProjectID': project_id,
        'Name': 'Epic Cloud Migration - NGHS',
        'Description': 'Migration of Epic EHR to cloud infrastructure',
        'CompanyId': company_id,
        'Status': 'In Progress',
        'StartDate': '2025-01-01',
        'EndDate': '2025-06-30',
        'CutoverDate': '2025-05-15',
        'ProjectManager': 'John Smith',
        'Budget': 1000000,
        'CreatedAt': datetime.utcnow().isoformat(),
        'CreatedBy': 'admin@eams.com',
        'Applications': [],
        'Contacts': [],
        'Issues': [],
        'DiscoveryQuestions': []
    }
    
    dynamodb.put_item(TableName=table_name, Item=item)
    print(f"✅ Created sample project: {project_id}")
    return project_id

def create_sample_application(dynamodb, table_name, project_id, company_id):
    """Create a sample application"""
    app_id = f'app-{str(uuid.uuid4())[:8]}'
    item = {
        'PK': f'APPLICATION#{app_id}',
        'SK': f'PROFILE#{app_id}',
        'GSI1PK': f'PROJECT#{project_id}',
        'GSI1SK': f'APPLICATION#{app_id}',
        'ApplicationID': app_id,
        'Name': 'Imprivata Badge Tap',
        'Vendor': 'Imprivata',
        'ProjectId': project_id,
        'CompanyId': company_id,
        'Criticality': 0,
        'Status': 'Pass',
        'TestingMethod': 'Test Badge Tap',
        'Manager': 'Scott Sanderson',
        'TaskOwner': 'Christopher Crisson',
        'Team': 'Client Engineering - Citrix',
        'CreatedAt': datetime.utcnow().isoformat(),
        'CreatedBy': 'admin@eams.com'
    }
    
    dynamodb.put_item(TableName=table_name, Item=item)
    print(f"✅ Created sample application: {app_id}")

def main():
    parser = argparse.ArgumentParser(description='Seed initial EAMS data')
    parser.add_argument('--region', default='us-east-1', help='AWS region')
    parser.add_argument('--users-table', required=True, help='Users table name')
    parser.add_argument('--companies-table', required=True, help='Companies table name')
    parser.add_argument('--projects-table', required=True, help='Projects table name')
    parser.add_argument('--applications-table', required=True, help='Applications table name')
    
    args = parser.parse_args()
    
    # Initialize DynamoDB
    dynamodb = boto3.client('dynamodb', region_name=args.region)
    
    print("🌱 Seeding initial EAMS data...")
    
    # Create primary company
    primary_company_id = create_primary_company(dynamodb, args.companies_table)
    
    # Create admin user
    admin_user_id = create_admin_user(dynamodb, args.users_table, primary_company_id)
    
    # Create sample company
    sample_company_id = create_sample_company(dynamodb, args.companies_table)
    
    # Create sample project
    sample_project_id = create_sample_project(dynamodb, args.projects_table, sample_company_id)
    
    # Create sample applications
    create_sample_application(dynamodb, args.applications_table, sample_project_id, sample_company_id)
    create_sample_application(dynamodb, args.applications_table, sample_project_id, sample_company_id)
    create_sample_application(dynamodb, args.applications_table, sample_project_id, sample_company_id)
    
    print("🎉 Initial data seeding completed!")

if __name__ == '__main__':
    main()







