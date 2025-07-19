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

    // Validate file
    validateFile(file, options = {}) {
        const isMobile = options.isMobile || /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent);
        
        console.log('Validating file:', file.name, 'Size:', utils.formatFileSize(file.size), 'Type:', file.type, 'Mobile:', isMobile);
        
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            const errorMsg = `Please upload a valid image file (PNG, JPG, or GIF). Your file type "${file.type}" is not supported.`;
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

        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
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
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { utils };
}
