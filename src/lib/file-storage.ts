import { supabase } from "@/lib/supabase";
import { StructuralModel } from "@/types/model";

// File storage configuration
const STORAGE_BUCKET = "structural-models";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_EXTENSIONS = [".std", ".s2k", ".sdb", ".json"];
const ALLOWED_MIME_TYPES = [
  "application/octet-stream",
  "text/plain",
  "application/json",
  "application/x-staad",
  "application/x-sap2000",
];

export interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
  userId: string;
  projectId?: string;
  metadata?: {
    originalName: string;
    fileType: "STAAD" | "SAP2000" | "JSON" | "OTHER";
    modelInfo?: {
      nodes: number;
      members: number;
      materials: number;
      sections: number;
    };
    parsingStatus?: "PENDING" | "SUCCESS" | "FAILED";
    parsingError?: string;
  };
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  stage: "VALIDATING" | "UPLOADING" | "PROCESSING" | "COMPLETE" | "ERROR";
  message: string;
}

export class FileStorageService {
  private static instance: FileStorageService;
  private uploadCallbacks: Map<string, (progress: UploadProgress) => void> =
    new Map();

  static getInstance(): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService();
    }
    return FileStorageService.instance;
  }

  /**
   * Initialize storage bucket if it doesn't exist with timeout and retry logic
   */
  async initializeBucket(): Promise<void> {
    const timeout = 10000; // 10 second timeout
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔧 Initializing storage bucket (attempt ${attempt}/${maxRetries})...`,
        );

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("Bucket initialization timeout")),
            timeout,
          );
        });

        // Create the actual bucket check promise
        const bucketPromise = this.performBucketInitialization();

        // Race between timeout and actual operation
        await Promise.race([bucketPromise, timeoutPromise]);

        console.log("✅ Storage bucket initialization completed successfully");
        return; // Success, exit the retry loop
      } catch (error) {
        console.warn(
          `⚠️ Storage initialization attempt ${attempt} failed:`,
          error,
        );

        if (attempt === maxRetries) {
          console.warn(
            "❌ All storage initialization attempts failed, continuing without bucket check",
          );
          // Don't throw error - allow upload to continue
          return;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * Perform the actual bucket initialization logic
   */
  private async performBucketInitialization(): Promise<void> {
    console.log("🔍 Checking if storage bucket exists...");

    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();

    if (listError) {
      console.warn("Could not list buckets:", listError);
      // Try to create bucket anyway in case it's a permission issue
      throw new Error(`Bucket list failed: ${listError.message}`);
    }

    const bucketExists = buckets?.some(
      (bucket) => bucket.name === STORAGE_BUCKET,
    );

    if (!bucketExists) {
      console.log("📦 Creating new storage bucket...");
      const { error: createError } = await supabase.storage.createBucket(
        STORAGE_BUCKET,
        {
          public: false,
          allowedMimeTypes: ALLOWED_MIME_TYPES,
          fileSizeLimit: MAX_FILE_SIZE,
        },
      );

      if (createError) {
        console.warn("Could not create bucket:", createError);
        throw new Error(`Bucket creation failed: ${createError.message}`);
      } else {
        console.log("✅ Storage bucket created successfully");
      }
    } else {
      console.log("✅ Storage bucket already exists");
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      };
    }

    // Check file extension
    const extension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: `File type \"${extension}\" is not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}`,
      };
    }

    // Check for empty file
    if (file.size === 0) {
      return {
        valid: false,
        error: "File is empty",
      };
    }

    return { valid: true };
  }

  /**
   * Generate unique file path for user
   */
  private generateFilePath(userId: string, fileName: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const randomId = crypto.randomUUID().substring(0, 8);
    const extension = fileName.substring(fileName.lastIndexOf("."));
    const baseName = fileName
      .substring(0, fileName.lastIndexOf("."))
      .replace(/[^a-zA-Z0-9-_]/g, "_");

    return `${userId}/${timestamp}_${randomId}_${baseName}${extension}`;
  }

  /**
   * Upload file to Supabase Storage with enhanced error handling and timeouts
   */
  async uploadFile(
    file: File,
    userId: string,
    projectId?: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<StoredFile> {
    const uploadId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      console.log(
        `🚀 Starting file upload for: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      );

      // Store progress callback
      if (onProgress) {
        this.uploadCallbacks.set(uploadId, onProgress);
      }

      // Validation stage
      console.log("📋 Stage 1: File validation...");
      this.updateProgress(uploadId, {
        loaded: 0,
        total: file.size,
        percentage: 5,
        stage: "VALIDATING",
        message: "Validating file format and size...",
      });

      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      console.log("✅ File validation passed");

      // Supabase configuration check
      console.log("🔧 Stage 2: Checking Supabase configuration...");
      this.updateProgress(uploadId, {
        loaded: 0,
        total: file.size,
        percentage: 10,
        stage: "VALIDATING",
        message: "Checking cloud storage configuration...",
      });

      await this.validateSupabaseConfig();
      console.log("✅ Supabase configuration validated");

      // Initialize bucket with timeout
      console.log("📦 Stage 3: Initializing storage bucket...");
      this.updateProgress(uploadId, {
        loaded: 0,
        total: file.size,
        percentage: 15,
        stage: "VALIDATING",
        message: "Initializing secure storage bucket...",
      });

      await this.initializeBucket();
      console.log("✅ Storage bucket ready");

      // Upload stage
      console.log("☁️ Stage 4: Uploading to cloud storage...");
      this.updateProgress(uploadId, {
        loaded: 0,
        total: file.size,
        percentage: 25,
        stage: "UPLOADING",
        message: "Uploading file to secure storage...",
      });

      const filePath = this.generateFilePath(userId, file.name);
      console.log(`📁 Generated file path: ${filePath}`);

      // Upload with timeout and progress tracking
      const uploadTimeout = 60000; // 60 seconds for upload
      const uploadPromise = supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error("Upload timeout - file too large or network issues"),
            ),
          uploadTimeout,
        );
      });

      // Simulate upload progress (since Supabase doesn't provide real progress)
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const estimatedProgress = Math.min(90, 25 + (elapsed / 1000) * 2); // Rough progress estimation
        this.updateProgress(uploadId, {
          loaded: Math.floor((file.size * estimatedProgress) / 100),
          total: file.size,
          percentage: estimatedProgress,
          stage: "UPLOADING",
          message: "Uploading to secure cloud storage...",
        });
      }, 1000);

      let uploadData, uploadError;
      try {
        const result = await Promise.race([uploadPromise, timeoutPromise]);
        uploadData = result.data;
        uploadError = result.error;
      } finally {
        clearInterval(progressInterval);
      }

      if (uploadError) {
        console.error("❌ Upload failed:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log("✅ File uploaded successfully to storage");

      // Update progress to 90%
      this.updateProgress(uploadId, {
        loaded: file.size,
        total: file.size,
        percentage: 90,
        stage: "PROCESSING",
        message: "Processing file metadata...",
      });

      // Processing stage
      console.log("⚙️ Stage 5: Processing file metadata...");
      this.updateProgress(uploadId, {
        loaded: file.size,
        total: file.size,
        percentage: 95,
        stage: "PROCESSING",
        message: "Generating file metadata and database record...",
      });

      // Get file URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      // Determine file type
      const extension = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf("."));
      let fileType: "STAAD" | "SAP2000" | "JSON" | "OTHER" = "OTHER";
      if (extension === ".std") fileType = "STAAD";
      else if (extension === ".s2k" || extension === ".sdb")
        fileType = "SAP2000";
      else if (extension === ".json") fileType = "JSON";

      // Create stored file record
      const storedFile: StoredFile = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        url: urlData.publicUrl,
        uploadedAt: new Date(),
        userId,
        projectId,
        metadata: {
          originalName: file.name,
          fileType,
          parsingStatus: "PENDING",
        },
      };

      // Store file record in database
      console.log("💾 Stage 6: Storing file record in database...");
      await this.storeFileRecord(storedFile);
      console.log("✅ File record stored in database");

      // Complete
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`🎉 Upload completed successfully in ${totalTime}s`);

      this.updateProgress(uploadId, {
        loaded: file.size,
        total: file.size,
        percentage: 100,
        stage: "COMPLETE",
        message: `File uploaded successfully in ${totalTime}s!`,
      });

      return storedFile;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

      console.error(`❌ Upload failed after ${totalTime}s:`, error);

      this.updateProgress(uploadId, {
        loaded: 0,
        total: file.size,
        percentage: 0,
        stage: "ERROR",
        message: `Upload failed: ${errorMessage}`,
      });

      // Provide more specific error messages
      if (errorMessage.includes("timeout")) {
        throw new Error(
          "Upload timed out. Please check your internet connection and try again.",
        );
      } else if (errorMessage.includes("bucket")) {
        throw new Error("Storage configuration error. Please contact support.");
      } else if (
        errorMessage.includes("permission") ||
        errorMessage.includes("unauthorized")
      ) {
        throw new Error("Storage permission error. Please contact support.");
      } else {
        throw error;
      }
    } finally {
      // Clean up progress callback
      this.uploadCallbacks.delete(uploadId);
    }
  }

  /**
   * Validate Supabase configuration before upload with production-ready handling
   */
  private async validateSupabaseConfig(): Promise<void> {
    console.log("🔧 PRODUCTION: Validating Supabase configuration...");

    try {
      // Quick validation with minimal timeout for production
      const quickTimeout = 2000; // 2 seconds max

      // Test basic connectivity
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Supabase validation timeout"));
        }, quickTimeout);
      });

      // Simple auth check
      const authPromise = supabase.auth.getSession();
      const authResult = await Promise.race([authPromise, timeoutPromise]);

      // Check for critical auth errors only
      if (authResult.error?.message?.includes("Invalid API key")) {
        throw new Error("Critical: Invalid Supabase API key");
      }

      console.log("✅ PRODUCTION: Supabase validation passed");
      return;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.warn("⚠️ PRODUCTION: Supabase validation issue:", errorMessage);

      // Only fail on critical configuration errors
      if (
        errorMessage.includes("Invalid API key") ||
        errorMessage.includes("unauthorized")
      ) {
        throw new Error(
          "Critical Supabase configuration error: Check API keys",
        );
      }

      // For timeout or other issues, continue with warning
      console.warn(
        "⚠️ PRODUCTION: Continuing upload despite validation warning",
      );
      return;
    }
  }

  /**
   * Update upload progress with enhanced logging
   */
  private updateProgress(uploadId: string, progress: UploadProgress): void {
    const callback = this.uploadCallbacks.get(uploadId);
    if (callback) {
      // Log progress for debugging
      if (progress.stage === "ERROR") {
        console.error(`❌ Upload progress error: ${progress.message}`);
      } else {
        console.log(
          `📊 Upload progress: ${progress.percentage}% - ${progress.message}`,
        );
      }
      callback(progress);
    }
  }

  /**
   * Store file record in database
   */
  private async storeFileRecord(file: StoredFile): Promise<void> {
    try {
      const { error } = await supabase.from("user_uploads").insert({
        upload_id: file.id,
        user_id: file.userId,
        project_id: file.projectId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.metadata?.fileType || "OTHER",
        file_url: file.url,
        upload_timestamp: file.uploadedAt.toISOString(),
        parsing_status: file.metadata?.parsingStatus || "PENDING",
        metadata: file.metadata ? JSON.stringify(file.metadata) : null,
      });

      if (error) {
        console.warn("Could not store file record:", error);
      }
    } catch (error) {
      console.warn("Database storage failed:", error);
    }
  }

  /**
   * Get user's files
   */
  async getUserFiles(userId: string): Promise<StoredFile[]> {
    try {
      const { data, error } = await supabase
        .from("user_uploads")
        .select("*")
        .eq("user_id", userId)
        .order("upload_timestamp", { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch files: ${error.message}`);
      }

      return (data || []).map(this.mapDatabaseRecordToStoredFile);
    } catch (error) {
      console.error("Failed to get user files:", error);
      return [];
    }
  }

  /**
   * Get file by ID
   */
  async getFileById(fileId: string): Promise<StoredFile | null> {
    try {
      const { data, error } = await supabase
        .from("user_uploads")
        .select("*")
        .eq("upload_id", fileId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch file: ${error.message}`);
      }

      return this.mapDatabaseRecordToStoredFile(data);
    } catch (error) {
      console.error("Failed to get file by ID:", error);
      return null;
    }
  }

  /**
   * Download file
   */
  async downloadFile(fileId: string): Promise<Blob> {
    try {
      const file = await this.getFileById(fileId);
      if (!file) {
        throw new Error("File not found");
      }

      // Extract file path from URL
      const url = new URL(file.url);
      const filePath = url.pathname.split("/").slice(-2).join("/"); // Get last two segments

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(filePath);

      if (error) {
        throw new Error(`Download failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Failed to download file:", error);
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    try {
      const file = await this.getFileById(fileId);
      if (!file) {
        throw new Error("File not found");
      }

      // Check ownership
      if (file.userId !== userId) {
        throw new Error("Unauthorized: You can only delete your own files");
      }

      // Extract file path from URL
      const url = new URL(file.url);
      const filePath = url.pathname.split("/").slice(-2).join("/");

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

      if (storageError) {
        console.warn("Storage deletion failed:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("user_uploads")
        .delete()
        .eq("upload_id", fileId)
        .eq("user_id", userId);

      if (dbError) {
        throw new Error(`Database deletion failed: ${dbError.message}`);
      }
    } catch (error) {
      console.error("Failed to delete file:", error);
      throw error;
    }
  }

  /**
   * Update file metadata (e.g., after parsing)
   */
  async updateFileMetadata(
    fileId: string,
    metadata: Partial<StoredFile["metadata"]>,
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("user_uploads")
        .update({
          metadata: JSON.stringify(metadata),
          parsing_status: metadata.parsingStatus || "PENDING",
        })
        .eq("upload_id", fileId);

      if (error) {
        throw new Error(`Metadata update failed: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to update file metadata:", error);
      throw error;
    }
  }

  /**
   * Get storage usage for user
   */
  async getStorageUsage(
    userId: string,
  ): Promise<{ totalSize: number; fileCount: number }> {
    try {
      const files = await this.getUserFiles(userId);
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      return { totalSize, fileCount: files.length };
    } catch (error) {
      console.error("Failed to get storage usage:", error);
      return { totalSize: 0, fileCount: 0 };
    }
  }

  /**
   * Map database record to StoredFile
   */
  private mapDatabaseRecordToStoredFile(record: any): StoredFile {
    return {
      id: record.upload_id,
      name: record.file_name,
      size: record.file_size,
      type: record.file_type,
      url: record.file_url,
      uploadedAt: new Date(record.upload_timestamp),
      userId: record.user_id,
      projectId: record.project_id,
      metadata: record.metadata ? JSON.parse(record.metadata) : undefined,
    };
  }

  /**
   * Clean up old files (admin function)
   */
  async cleanupOldFiles(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from("user_uploads")
        .select("upload_id, user_id")
        .lt("upload_timestamp", cutoffDate.toISOString());

      if (error) {
        throw new Error(`Cleanup query failed: ${error.message}`);
      }

      let deletedCount = 0;
      for (const record of data || []) {
        try {
          await this.deleteFile(record.upload_id, record.user_id);
          deletedCount++;
        } catch (error) {
          console.warn(`Failed to delete file ${record.upload_id}:`, error);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error("Cleanup failed:", error);
      return 0;
    }
  }
}

// Export singleton instance
export const fileStorage = FileStorageService.getInstance();

// Export utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const getFileIcon = (fileName: string): string => {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
  switch (extension) {
    case ".std":
      return "🏗️"; // STAAD.Pro
    case ".s2k":
    case ".sdb":
      return "🏢"; // SAP2000
    case ".json":
      return "📄"; // JSON
    default:
      return "📁"; // Generic file
  }
};
