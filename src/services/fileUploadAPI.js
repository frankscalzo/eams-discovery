import AWS from 'aws-sdk';

const fileUploadAPI = {
  // S3 configuration
  s3: new AWS.S3({
    region: process.env.REACT_APP_AWS_REGION || 'us-east-1'
  }),

  // Upload file to company-specific folder
  async uploadFile(file, companyId, applicationId, metadata = {}) {
    try {
      const bucketName = `eams-${process.env.REACT_APP_ENVIRONMENT || 'dev'}-storage`;
      const key = `companies/${companyId}/applications/${applicationId}/${file.name}`;
      
      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: file,
        ContentType: file.type,
        Metadata: {
          originalName: file.name,
          uploadedBy: metadata.uploadedBy || 'unknown',
          uploadedAt: new Date().toISOString(),
          applicationId: applicationId,
          companyId: companyId,
          ...metadata
        }
      };

      const result = await this.s3.upload(uploadParams).promise();
      
      return {
        success: true,
        fileUrl: result.Location,
        key: key,
        bucket: bucketName,
        metadata: {
          ...uploadParams.Metadata,
          size: file.size,
          lastModified: file.lastModified
        }
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get signed URL for file download
  async getSignedDownloadUrl(key, bucketName, expiresIn = 3600) {
    try {
      const params = {
        Bucket: bucketName,
        Key: key,
        Expires: expiresIn
      };

      const url = await this.s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  },

  // List files for a specific application
  async listApplicationFiles(companyId, applicationId) {
    try {
      const bucketName = `eams-${process.env.REACT_APP_ENVIRONMENT || 'dev'}-storage`;
      const prefix = `companies/${companyId}/applications/${applicationId}/`;
      
      const params = {
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: 1000
      };

      const result = await this.s3.listObjectsV2(params).promise();
      
      return result.Contents.map(file => ({
        key: file.Key,
        name: file.Key.split('/').pop(),
        size: file.Size,
        lastModified: file.LastModified,
        url: `https://${bucketName}.s3.amazonaws.com/${file.Key}`
      }));
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  },

  // Delete a file
  async deleteFile(key, bucketName) {
    try {
      const params = {
        Bucket: bucketName,
        Key: key
      };

      await this.s3.deleteObject(params).promise();
      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      return { success: false, error: error.message };
    }
  },

  // Get file metadata
  async getFileMetadata(key, bucketName) {
    try {
      const params = {
        Bucket: bucketName,
        Key: key
      };

      const result = await this.s3.headObject(params).promise();
      return {
        size: result.ContentLength,
        contentType: result.ContentType,
        lastModified: result.LastModified,
        metadata: result.Metadata
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  },

  // Create company folder structure
  async createCompanyFolder(companyId) {
    try {
      const bucketName = `eams-${process.env.REACT_APP_ENVIRONMENT || 'dev'}-storage`;
      const folderKey = `companies/${companyId}/`;
      
      // Create a placeholder file to ensure the folder exists
      const params = {
        Bucket: bucketName,
        Key: `${folderKey}.gitkeep`,
        Body: '',
        ContentType: 'text/plain'
      };

      await this.s3.upload(params).promise();
      return { success: true, folderPath: folderKey };
    } catch (error) {
      console.error('Error creating company folder:', error);
      return { success: false, error: error.message };
    }
  },

  // Get storage usage for a company
  async getCompanyStorageUsage(companyId) {
    try {
      const bucketName = `eams-${process.env.REACT_APP_ENVIRONMENT || 'dev'}-storage`;
      const prefix = `companies/${companyId}/`;
      
      const params = {
        Bucket: bucketName,
        Prefix: prefix
      };

      let totalSize = 0;
      let fileCount = 0;
      let continuationToken;

      do {
        const result = await this.s3.listObjectsV2({
          ...params,
          ContinuationToken: continuationToken
        }).promise();

        result.Contents.forEach(file => {
          totalSize += file.Size;
          fileCount++;
        });

        continuationToken = result.NextContinuationToken;
      } while (continuationToken);

      return {
        totalSize,
        fileCount,
        totalSizeFormatted: this.formatFileSize(totalSize)
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      throw error;
    }
  },

  // Format file size for display
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

export default fileUploadAPI;
