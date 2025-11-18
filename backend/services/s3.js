// backend/services/s3.js
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "studybuddy-resources";

const s3Service = {
  // Upload file to S3
  uploadFile: async (fileBuffer, fileName, fileType, groupId) => {
    try {
      const key = `groups/${groupId}/${Date.now()}-${fileName}`;

      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: fileType,
        Metadata: {
          groupId: groupId,
          uploadedAt: new Date().toISOString(),
        },
      };

      const command = new PutObjectCommand(params);
      await s3Client.send(command);

      return {
        success: true,
        key: key,
        url: `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`,
        fileName: fileName,
        fileType: fileType,
      };
    } catch (error) {
      console.error("S3 upload error:", error);
      throw new Error("Failed to upload file to S3");
    }
  },

  // Get file from S3 (returns signed URL)
  getFile: async (key, expiresIn = 3600) => {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
      };

      const command = new GetObjectCommand(params);
      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: expiresIn, // URL expires in 1 hour by default
      });

      return {
        success: true,
        url: signedUrl,
        expiresIn: expiresIn,
      };
    } catch (error) {
      console.error("S3 get file error:", error);
      throw new Error("Failed to get file from S3");
    }
  },

  // Generate presigned URL for upload (client-side upload)
  getUploadUrl: async (fileName, fileType, groupId, expiresIn = 3600) => {
    try {
      const key = `groups/${groupId}/${Date.now()}-${fileName}`;

      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: fileType,
        Metadata: {
          groupId: groupId,
          uploadedAt: new Date().toISOString(),
        },
      };

      const command = new PutObjectCommand(params);
      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: expiresIn,
      });

      return {
        success: true,
        uploadUrl: signedUrl,
        key: key,
        publicUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`,
        expiresIn: expiresIn,
      };
    } catch (error) {
      console.error("S3 get upload URL error:", error);
      throw new Error("Failed to generate upload URL");
    }
  },

  // Delete file from S3
  deleteFile: async (key) => {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
      };

      const command = new DeleteObjectCommand(params);
      await s3Client.send(command);

      return {
        success: true,
        message: "File deleted successfully",
      };
    } catch (error) {
      console.error("S3 delete error:", error);
      throw new Error("Failed to delete file from S3");
    }
  },

  // List files for a group
  listGroupFiles: async (groupId) => {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Prefix: `groups/${groupId}/`,
      };

      const command = new ListObjectsV2Command(params);
      const response = await s3Client.send(command);

      const files = (response.Contents || []).map((item) => ({
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified,
        url: `https://${BUCKET_NAME}.s3.amazonaws.com/${item.Key}`,
      }));

      return {
        success: true,
        files: files,
        count: files.length,
      };
    } catch (error) {
      console.error("S3 list files error:", error);
      throw new Error("Failed to list files from S3");
    }
  },

  // Delete all files for a group
  deleteGroupFiles: async (groupId) => {
    try {
      // List all files first
      const listResult = await s3Service.listGroupFiles(groupId);

      // Delete each file
      const deletePromises = listResult.files.map((file) =>
        s3Service.deleteFile(file.key)
      );

      await Promise.all(deletePromises);

      return {
        success: true,
        message: `Deleted ${listResult.count} files`,
        deletedCount: listResult.count,
      };
    } catch (error) {
      console.error("S3 delete group files error:", error);
      throw new Error("Failed to delete group files from S3");
    }
  },

  // Get file metadata
  getFileMetadata: async (key) => {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
      };

      const command = new GetObjectCommand(params);
      const response = await s3Client.send(command);

      return {
        success: true,
        metadata: {
          contentType: response.ContentType,
          contentLength: response.ContentLength,
          lastModified: response.LastModified,
          metadata: response.Metadata,
        },
      };
    } catch (error) {
      console.error("S3 get metadata error:", error);
      throw new Error("Failed to get file metadata");
    }
  },
};

module.exports = { s3Service };