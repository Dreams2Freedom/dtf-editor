// DTF Editor - Shared Utilities

// Global utility functions
const utils = {
    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Debounce function for performance
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 fade-in ${
            type === 'error' ? 'bg-red-500 text-white' : 
            type === 'success' ? 'bg-green-500 text-white' : 
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    },

    // Detect RAW image formats
    detectRawFormat(file) {
        console.log('=== RAW FORMAT DETECTION ===');
        console.log('File name:', file.name);
        console.log('File type:', file.type);
        console.log('File size:', file.size);
        
        const rawExtensions = [
            // Canon
            '.cr2', '.cr3', '.crw',
            // Nikon
            '.nef', '.nrw',
            // Sony
            '.arw', '.srw',
            // Fujifilm
            '.raf',
            // Olympus
            '.orf',
            // Panasonic
            '.rw2',
            // Pentax
            '.dng', '.pef',
            // Leica
            '.rwl',
            // Hasselblad
            '.3fr',
            // Phase One
            '.iiq',
            // Sigma
            '.x3f',
            // iPhone ProRAW
            '.dng', '.raw',
            // Other
            '.raw', '.dng', '.tiff', '.tif'
        ];
        
        const fileName = file.name.toLowerCase();
        const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
        
        // Check file extension
        if (rawExtensions.includes(fileExtension)) {
            return {
                isRaw: true,
                format: fileExtension.toUpperCase(),
                type: 'extension'
            };
        }
        
        // Check MIME type for RAW formats
        const rawMimeTypes = [
            'image/x-canon-cr2',
            'image/x-canon-cr3',
            'image/x-nikon-nef',
            'image/x-sony-arw',
            'image/x-adobe-dng',
            'image/tiff',
            'image/x-tiff',
            'image/x-raw',
            'image/raw',
            'application/octet-stream' // Sometimes RAW files are detected as this
        ];
        
        if (rawMimeTypes.includes(file.type)) {
            console.log('RAW MIME type detected:', file.type);
            return {
                isRaw: true,
                format: file.type,
                type: 'mime'
            };
        }
        
        // Check for RAW in filename patterns
        const rawPatterns = [
            /\.cr[23w]$/i,  // Canon
            /\.nef$/i,      // Nikon
            /\.arw$/i,      // Sony
            /\.raf$/i,      // Fujifilm
            /\.orf$/i,      // Olympus
            /\.rw2$/i,      // Panasonic
            /\.pef$/i,      // Pentax
            /\.rwl$/i,      // Leica
            /\.3fr$/i,      // Hasselblad
            /\.iiq$/i,      // Phase One
            /\.x3f$/i,      // Sigma
            /\.raw$/i,      // Generic RAW
            /\.dng$/i,      // Adobe DNG
            /\.tiff?$/i,    // TIFF
            /proraw/i,      // iPhone ProRAW
            /raw$/i,        // Any file ending with RAW
            /\.dng$/i       // DNG files (iPhone ProRAW)
        ];
        
        for (const pattern of rawPatterns) {
            console.log('Testing pattern:', pattern, 'against filename:', fileName);
            if (pattern.test(fileName)) {
                const match = fileName.match(pattern);
                console.log('RAW pattern matched:', match[0]);
                return {
                    isRaw: true,
                    format: match[0].toUpperCase(),
                    type: 'pattern'
                };
            }
        }
        
        console.log('No RAW patterns matched');
        return { isRaw: false };
    },

    // Get specific guidance for unsupported formats
    getFormatGuidance(mimeType, fileName) {
        const fileNameLower = fileName.toLowerCase();
        
        // Check for specific formats and provide guidance
        if (mimeType === 'image/webp') {
            return 'WebP format is not supported. Please convert to JPEG or PNG using an online converter or photo editing software.';
        }
        
        if (mimeType === 'image/svg+xml' || fileNameLower.includes('.svg')) {
            return 'SVG files are vector graphics and cannot be processed. Please use a raster image format like JPEG or PNG.';
        }
        
        if (mimeType === 'image/bmp' || fileNameLower.includes('.bmp')) {
            return 'BMP format is not supported. Please convert to JPEG or PNG format.';
        }
        
        if (mimeType === 'image/tiff' || fileNameLower.includes('.tiff') || fileNameLower.includes('.tif')) {
            return 'TIFF format is not supported. Please convert to JPEG or PNG format.';
        }
        
        if (mimeType === 'image/heic' || fileNameLower.includes('.heic') || fileNameLower.includes('.heif')) {
            return 'HEIC format is not supported. Please convert to JPEG or PNG format. You can do this in your iPhone\'s Photos app by sharing and selecting "Convert to JPEG".';
        }
        
        if (mimeType === 'image/avif' || fileNameLower.includes('.avif')) {
            return 'AVIF format is not supported. Please convert to JPEG or PNG format.';
        }
        
        // Generic message for unknown formats
        return `Your file type "${mimeType}" is not supported. Please use JPEG, PNG, or GIF format.`;
    },

    // Validate file
    validateFile(file, options = {}) {
        const isMobile = options.isMobile || /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent);
        
        console.log('Validating file:', file.name, 'Size:', utils.formatFileSize(file.size), 'Type:', file.type, 'Mobile:', isMobile);
        
        // Check for RAW image formats
        const rawFormats = utils.detectRawFormat(file);
        if (rawFormats.isRaw) {
            const errorMsg = `RAW image format (${rawFormats.format}) is not supported. Please convert your image to JPEG, PNG, or GIF format first. RAW files need to be processed in photo editing software before uploading.`;
            console.error('RAW format detected:', rawFormats.format);
            utils.showNotification(errorMsg, 'error');
            return false;
        }
        
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            // Provide specific guidance for common unsupported formats
            const formatGuidance = utils.getFormatGuidance(file.type, file.name);
            const errorMsg = `File format not supported. ${formatGuidance}`;
            console.error('File type validation failed:', file.type);
            utils.showNotification(errorMsg, 'error');
            return false;
        }

        // Check file size with mobile-specific limits
        const maxSize = isMobile ? (5 * 1024 * 1024) : (10 * 1024 * 1024); // 5MB for mobile, 10MB for desktop
        const maxSizeMB = isMobile ? 5 : 10;
        
        if (file.size > maxSize) {
            const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
            const errorMsg = isMobile 
                ? `File is too large for mobile processing. Your file is ${fileSizeMB}MB, but mobile devices are limited to ${maxSizeMB}MB. Please use a smaller image or try on desktop.`
                : `File size must be less than ${maxSizeMB}MB. Your file is ${fileSizeMB}MB.`;
            
            console.error('File size validation failed:', fileSizeMB, 'MB (max:', maxSizeMB, 'MB)');
            utils.showNotification(errorMsg, 'error');
            return false;
        }

        // Check for empty files
        if (file.size === 0) {
            const errorMsg = 'The selected file is empty. Please choose a valid image file.';
            console.error('File is empty');
            utils.showNotification(errorMsg, 'error');
            return false;
        }

        console.log('File validation passed');
        return true;
    },

    // Prevent default events
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },

    // Setup drag and drop
    setupDragAndDrop(uploadArea, fileInput, callback) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, utils.preventDefaults, false);
            document.body.addEventListener(eventName, utils.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover');
            }, false);
        });

        uploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                callback(files[0]);
            }
        }, false);

        // Removed the click handler to prevent duplicate event listeners
        // The click handler is now managed in the individual component's setupEventListeners
    },

    // Simulate progress
    simulateProgress(progressBar, progressText, duration = 2000) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 8;
            if (progress > 85) {
                progress = 85;
                clearInterval(interval);
            }
            progressBar.style.width = `${progress}%`;
            if (progressText) {
                progressText.textContent = `Processing... ${Math.round(progress)}%`;
            }
        }, 300);
        
        return interval;
    },

    // Download file
    downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // Rate limiting utility with exponential backoff
    async retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                const isRateLimited = error.message.includes('rate limit') || 
                                    error.message.includes('Too many requests') ||
                                    error.message.includes('temporarily unavailable') ||
                                    error.message.includes('high demand');
                
                if (isRateLimited && attempt < maxRetries) {
                    const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                    console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
                    
                    // Show user-friendly retry message
                    utils.showNotification(`Service busy, retrying in ${Math.round(delay/1000)} seconds...`, 'info');
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                
                throw error; // Re-throw if not rate limited or max retries reached
            }
        }
    },

    // Enhanced error handling for API calls
    handleApiError(error, context = 'operation') {
        console.error(`${context} error:`, error);
        
        if (error.message.includes('rate limit') || error.message.includes('Too many requests')) {
            utils.showNotification('Service temporarily unavailable due to high demand. Please try again in a few minutes.', 'error');
        } else if (error.message.includes('temporarily unavailable')) {
            utils.showNotification('Service temporarily unavailable. Please try again later.', 'error');
        } else if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
            utils.showNotification('Network connection error. Please check your internet connection and try again.', 'error');
        } else {
            utils.showNotification(`Failed to ${context}. Please try again.`, 'error');
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { utils };
}
