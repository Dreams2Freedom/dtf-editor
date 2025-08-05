import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

interface FileValidation {
  isValid: boolean;
  error?: string;
}

export class StorageService {
  private bucketName = 'user-uploads';
  private supabase;

  constructor() {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('StorageService: Missing required environment variables', {
        hasUrl: !!env.SUPABASE_URL,
        hasServiceKey: !!env.SUPABASE_SERVICE_ROLE_KEY
      });
      throw new Error('Missing required Supabase configuration');
    }
    this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  /**
   * Test the Supabase storage connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to list buckets as a simple connection test
      const { data, error } = await this.supabase.storage.listBuckets();
      
      if (error) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Upload an image to Supabase Storage
   */
  public async uploadImage(file: File, userId: string): Promise<UploadResult> {
    return this.uploadFile(file, userId);
  }

  /**
   * Upload an image from data URL to Supabase Storage
   */
  public async uploadImageFromDataUrl(dataUrl: string, fileName: string, userId: string): Promise<UploadResult> {
    try {
      // Convert data URL to File object
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type });
      
      return this.uploadFile(file, userId);
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Failed to upload image from data URL'
      };
    }
  }

  /**
   * Upload a file to Supabase Storage
   */
  public async uploadFile(file: File, userId?: string): Promise<UploadResult> {

    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Generate unique file path
      const filePath = this.generateFilePath(file.name, userId);

      // Try direct upload first
      try {
        const { data: uploadData, error: uploadError } = await this.supabase.storage
          .from(this.bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false // Don't overwrite existing files
          });

        if (uploadError) {
          throw uploadError;
        }
        const publicUrl = this.supabase.storage
          .from(this.bucketName)
          .getPublicUrl(filePath).data.publicUrl;

        
        // Ensure we always return a valid result
        if (!publicUrl) {
          return { success: false, error: 'Failed to generate public URL' };
        }
        
        return { success: true, url: publicUrl, path: filePath };

      } catch (directUploadError: any) {
        
        // Test connection and try to create bucket if needed
        await this.testConnection();
        
        // Try to create bucket first
        await this.ensureBucketExists();

        // Retry upload with new unique path
        const retryFilePath = this.generateFilePath(file.name, userId);
        const { data: retryData, error: retryError } = await this.supabase.storage
          .from(this.bucketName)
          .upload(retryFilePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (retryError) {
          return { 
            success: false, 
            error: retryError.message || 'Failed to upload file after retry'
          };
        }

        const publicUrl = this.supabase.storage
          .from(this.bucketName)
          .getPublicUrl(retryFilePath).data.publicUrl;

        
        // Ensure we always return a valid result
        if (!publicUrl) {
          return { success: false, error: 'Failed to generate public URL after retry' };
        }

        return { success: true, url: publicUrl, path: retryFilePath };
      }

    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Failed to upload file to storage'
      };
    }
  }

  /**
   * Delete an image from Supabase Storage
   */
  async deleteImage(path: string): Promise<UploadResult> {
    return this.deleteFile(path);
  }

  /**
   * Delete a file from Supabase Storage
   */
  async deleteFile(path: string): Promise<UploadResult> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([path]);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if the storage bucket exists, create if it doesn't
   */
  async ensureBucketExists(): Promise<boolean> {
    try {
      // Try to get bucket info to check if it exists
      const { data: buckets, error } = await this.supabase.storage.listBuckets();
      
      if (error) {
        // If we can't list buckets due to RLS, assume the bucket exists
        // This is common when RLS policies prevent listing buckets
        return true;
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);
      
      if (!bucketExists) {
        // Create the bucket if it doesn't exist
        const { error: createError } = await this.supabase.storage.createBucket(this.bucketName, {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          fileSizeLimit: 52428800 // 50MB
        });

        if (createError) {
          // If we can't create the bucket due to RLS, assume it exists or will be created by admin
          // This is common when RLS policies prevent bucket creation
          return true;
        }
      }

      return true;
    } catch (error) {
      // If there's an error, assume the bucket exists and try to use it
      return true;
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): FileValidation {
    if (!file) {
      return { isValid: false, error: 'No file selected.' };
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit (Vercel Pro)
      return { isValid: false, error: 'File size exceeds 50MB limit.' };
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'File type not supported. Please use JPEG, PNG, or WebP.' };
    }

    return { isValid: true };
  }

  /**
   * Sanitize filename to prevent encoding issues that might cause HTML error responses
   */
  private sanitizeFileName(fileName: string): string {
    // Replace problematic characters that might cause URL encoding issues
    return fileName
      .replace(/[%\s()[\]{}]/g, '_') // Replace spaces, parentheses, brackets, and percent signs
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace any other special characters
      .replace(/_+/g, '_') // Replace multiple underscores with single underscore
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  }

  private generateFilePath(originalName: string, userId?: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedName = this.sanitizeFileName(originalName);
    const fileName = `${timestamp}-${randomSuffix}-${sanitizedName}`;
    
    // If userId is provided, organize files by user
    if (userId) {
      return `users/${userId}/${fileName}`;
    }
    
    return `uploads/${fileName}`;
  }
}

export const storageService = new StorageService(); 