const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const BUCKET_NAME = 'user-images';

// Lazy initialization of Supabase client
let supabase = null;

function getSupabaseClient() {
    if (!supabase) {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        console.log('Supabase config check:', {
            SUPABASE_URL: SUPABASE_URL ? 'SET' : 'NOT SET',
            SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY ? 
                `${SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}...` : 'NOT SET'
        });
        
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Supabase Storage is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
        }
        
        // Check if the service role key looks valid (should start with 'eyJ')
        if (!SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) {
            console.error('Invalid Supabase Service Role Key format. Should start with "eyJ"');
            throw new Error('Invalid Supabase Service Role Key format');
        }
        
        supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        console.log('Supabase client created successfully');
    }
    return supabase;
}

class SupabaseStorage {
    /**
     * Upload a file to Supabase Storage
     * @param {string} userId - User ID
     * @param {string} filename - Original filename
     * @param {Buffer} fileBuffer - File buffer
     * @param {string} contentType - MIME type
     * @param {string} fileType - Type of file (original, processed, etc.)
     * @returns {Promise<Object>} Upload result with path and URL
     */
    static async uploadFile(userId, filename, fileBuffer, contentType, fileType = 'original') {
        try {
            const supabase = getSupabaseClient();
            
            // Create unique filename to avoid conflicts
            const timestamp = Date.now();
            const randomSuffix = Math.round(Math.random() * 1000000);
            const fileExtension = filename.split('.').pop();
            const uniqueFilename = `${fileType}_${timestamp}_${randomSuffix}.${fileExtension}`;
            
            // Create path: userId/filename
            const filePath = `${userId}/${uniqueFilename}`;
            
            console.log(`Uploading file to Supabase: ${filePath}`);
            
            const { data, error } = await supabase
                .storage
                .from(BUCKET_NAME)
                .upload(filePath, fileBuffer, {
                    contentType: contentType,
                    upsert: false // Don't overwrite existing files
                });
            
            if (error) {
                console.error('Supabase upload error:', error);
                throw new Error(`Failed to upload file: ${error.message}`);
            }
            
            console.log(`File uploaded successfully: ${data.path}`);
            
            return {
                path: data.path,
                filename: uniqueFilename,
                size: fileBuffer.length
            };
        } catch (error) {
            console.error('Error in uploadFile:', error);
            throw error;
        }
    }
    
    /**
     * Get a public URL for a file
     * @param {string} filePath - File path in storage
     * @returns {string} Public URL
     */
    static getPublicUrl(filePath) {
        const supabase = getSupabaseClient();
        const { data } = supabase
            .storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);
        
        return data.publicUrl;
    }
    
    /**
     * Create a signed URL for private file access
     * @param {string} filePath - File path in storage
     * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
     * @returns {Promise<string>} Signed URL
     */
    static async createSignedUrl(filePath, expiresIn = 3600) {
        try {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .storage
                .from(BUCKET_NAME)
                .createSignedUrl(filePath, expiresIn);
            
            if (error) {
                console.error('Error creating signed URL:', error);
                throw new Error(`Failed to create signed URL: ${error.message}`);
            }
            
            return data.signedUrl;
        } catch (error) {
            console.error('Error in createSignedUrl:', error);
            throw error;
        }
    }
    
    /**
     * Delete a file from Supabase Storage
     * @param {string} filePath - File path in storage
     * @returns {Promise<boolean>} Success status
     */
    static async deleteFile(filePath) {
        try {
            const supabase = getSupabaseClient();
            console.log(`Deleting file from Supabase: ${filePath}`);
            
            const { error } = await supabase
                .storage
                .from(BUCKET_NAME)
                .remove([filePath]);
            
            if (error) {
                console.error('Supabase delete error:', error);
                throw new Error(`Failed to delete file: ${error.message}`);
            }
            
            console.log(`File deleted successfully: ${filePath}`);
            return true;
        } catch (error) {
            console.error('Error in deleteFile:', error);
            throw error;
        }
    }
    
    /**
     * List files for a specific user
     * @param {string} userId - User ID
     * @param {string} folder - Optional subfolder
     * @returns {Promise<Array>} List of files
     */
    static async listUserFiles(userId, folder = '') {
        try {
            const supabase = getSupabaseClient();
            const path = folder ? `${userId}/${folder}` : `${userId}`;
            
            const { data, error } = await supabase
                .storage
                .from(BUCKET_NAME)
                .list(path);
            
            if (error) {
                console.error('Error listing files:', error);
                throw new Error(`Failed to list files: ${error.message}`);
            }
            
            return data || [];
        } catch (error) {
            console.error('Error in listUserFiles:', error);
            throw error;
        }
    }
    
    /**
     * Download a file as buffer
     * @param {string} filePath - File path in storage
     * @returns {Promise<Buffer>} File buffer
     */
    static async downloadFile(filePath) {
        try {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .storage
                .from(BUCKET_NAME)
                .download(filePath);
            
            if (error) {
                console.error('Error downloading file:', error);
                throw new Error(`Failed to download file: ${error.message}`);
            }
            
            return data;
        } catch (error) {
            console.error('Error in downloadFile:', error);
            throw error;
        }
    }
    
    /**
     * Get file metadata
     * @param {string} filePath - File path in storage
     * @returns {Promise<Object>} File metadata
     */
    static async getFileMetadata(filePath) {
        try {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .storage
                .from(BUCKET_NAME)
                .list('', {
                    search: filePath
                });
            
            if (error) {
                console.error('Error getting file metadata:', error);
                throw new Error(`Failed to get file metadata: ${error.message}`);
            }
            
            return data?.[0] || null;
        } catch (error) {
            console.error('Error in getFileMetadata:', error);
            throw error;
        }
    }
    
    /**
     * Check if file exists
     * @param {string} filePath - File path in storage
     * @returns {Promise<boolean>} Whether file exists
     */
    static async fileExists(filePath) {
        try {
            const metadata = await this.getFileMetadata(filePath);
            return metadata !== null;
        } catch (error) {
            console.error('Error checking if file exists:', error);
            return false;
        }
    }
    
    /**
     * Get file size
     * @param {string} filePath - File path in storage
     * @returns {Promise<number>} File size in bytes
     */
    static async getFileSize(filePath) {
        try {
            const metadata = await this.getFileMetadata(filePath);
            return metadata?.metadata?.size || 0;
        } catch (error) {
            console.error('Error getting file size:', error);
            return 0;
        }
    }
}

module.exports = SupabaseStorage; 