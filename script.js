// Vectorizer Pro - Main JavaScript File

class DTFEditorApp {
    constructor() {
        // Vectorization elements
        this.vectorizeUploadArea = document.getElementById('vectorizeUploadArea');
        this.vectorizeFileInput = document.getElementById('vectorize-file-upload');
        this.vectorizeProgress = document.getElementById('vectorizeProgress');
        this.vectorizeProgressBar = document.getElementById('vectorizeProgressBar');
        this.vectorizeProgressText = document.getElementById('vectorizeProgressText');
        this.vectorizeResult = document.getElementById('vectorizeResult');
        this.vectorizeOriginal = document.getElementById('vectorizeOriginal');
        this.vectorizeResultImg = document.getElementById('vectorizeResultImg');
        this.vectorizeDownloadBtn = document.getElementById('vectorizeDownloadBtn');
        this.vectorizeNewBtn = document.getElementById('vectorizeNewBtn');
        
        // Background removal elements
        this.bgRemoveUploadArea = document.getElementById('bgRemoveUploadArea');
        this.bgRemoveFileInput = document.getElementById('bg-remove-file-upload');
        this.bgRemoveProgress = document.getElementById('bgRemoveProgress');
        this.bgRemoveProgressBar = document.getElementById('bgRemoveProgressBar');
        this.bgRemoveProgressText = document.getElementById('bgRemoveProgressText');
        this.bgRemoveResult = document.getElementById('bgRemoveResult');
        this.bgRemoveOriginal = document.getElementById('bgRemoveOriginal');
        this.bgRemoveResultImg = document.getElementById('bgRemoveResult');
        this.bgRemoveDownloadBtn = document.getElementById('bgRemoveDownloadBtn');
        this.bgRemoveNewBtn = document.getElementById('bgRemoveNewBtn');
        
        // API configuration - using local proxy server
        this.vectorizerEndpoint = '/api/vectorize';
        this.clippingMagicEndpoint = '/api/remove-background';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        // Vectorization event listeners
        this.vectorizeFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleVectorization(file);
            }
        });

        this.vectorizeUploadArea.addEventListener('click', () => {
            this.vectorizeFileInput.click();
        });

        this.vectorizeDownloadBtn.addEventListener('click', () => {
            this.downloadVector();
        });

        this.vectorizeNewBtn.addEventListener('click', () => {
            this.resetVectorization();
        });

        // Background removal event listeners
        this.bgRemoveFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleBackgroundRemoval(file);
            }
        });

        this.bgRemoveUploadArea.addEventListener('click', () => {
            this.bgRemoveFileInput.click();
        });

        this.bgRemoveDownloadBtn.addEventListener('click', () => {
            this.downloadBackgroundRemoved();
        });

        this.bgRemoveNewBtn.addEventListener('click', () => {
            this.resetBackgroundRemoval();
        });

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    setupDragAndDrop() {
        // Vectorization drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.vectorizeUploadArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            this.vectorizeUploadArea.addEventListener(eventName, () => {
                this.vectorizeUploadArea.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.vectorizeUploadArea.addEventListener(eventName, () => {
                this.vectorizeUploadArea.classList.remove('dragover');
            }, false);
        });

        this.vectorizeUploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                this.handleVectorization(files[0]);
            }
        }, false);

        // Background removal drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.bgRemoveUploadArea.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            this.bgRemoveUploadArea.addEventListener(eventName, () => {
                this.bgRemoveUploadArea.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.bgRemoveUploadArea.addEventListener(eventName, () => {
                this.bgRemoveUploadArea.classList.remove('dragover');
            }, false);
        });

        this.bgRemoveUploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                this.handleBackgroundRemoval(files[0]);
            }
        }, false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    async handleVectorization(file) {
        // Validate file
        if (!this.validateFile(file)) {
            return;
        }

        // Show original image preview
        this.showVectorizeOriginalPreview(file);

        // Show progress
        this.showVectorizeProgress();

        try {
            // Start progress simulation
            const progressInterval = this.simulateVectorizeProgress();
            
            // Make actual API call to Vectorizer.AI
            const vectorData = await this.vectorizeImage(file);
            
            // Complete progress
            this.updateVectorizeProgress(100);
            
            // Show results
            this.showVectorizeResults(vectorData);
        } catch (error) {
            this.showVectorizeError('Failed to vectorize image. Please try again.');
            console.error('Vectorization error:', error);
        }
    }

    async handleBackgroundRemoval(file) {
        // Validate file
        if (!this.validateFile(file)) {
            return;
        }

        // Show original image preview
        this.showBgRemoveOriginalPreview(file);

        // Show progress
        this.showBgRemoveProgress();

        try {
            // Start progress simulation
            const progressInterval = this.simulateBgRemoveProgress();
            
            // Make actual API call to Clipping Magic
            const bgRemovedData = await this.removeBackground(file);
            
            // Complete progress
            this.updateBgRemoveProgress(100);
            
            // Show results
            this.showBgRemoveResults(bgRemovedData);
        } catch (error) {
            this.showBgRemoveError('Failed to remove background. Please try again.');
            console.error('Background removal error:', error);
        }
    }

    validateFile(file) {
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            this.showError('Please upload a valid image file (PNG, JPG, or GIF).');
            return false;
        }

        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.showError('File size must be less than 10MB.');
            return false;
        }

        return true;
    }

    showVectorizeOriginalPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.vectorizeOriginal.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    showBgRemoveOriginalPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.bgRemoveOriginal.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    showVectorizeProgress() {
        this.vectorizeProgress.classList.remove('hidden');
        this.simulateVectorizeProgress();
    }

    showBgRemoveProgress() {
        this.bgRemoveProgress.classList.remove('hidden');
        this.simulateBgRemoveProgress();
    }

    simulateVectorizeProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 8;
            if (progress > 85) {
                progress = 85;
                clearInterval(interval);
            }
            this.updateVectorizeProgress(progress);
        }, 300);
        
        return interval;
    }

    simulateBgRemoveProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 85) {
                progress = 85;
                clearInterval(interval);
            }
            this.updateBgRemoveProgress(progress);
        }, 250);
        
        return interval;
    }

    updateVectorizeProgress(percentage) {
        this.vectorizeProgressBar.style.width = `${percentage}%`;
        this.vectorizeProgressText.textContent = `Vectorizing... ${Math.round(percentage)}%`;
    }

    updateBgRemoveProgress(percentage) {
        this.bgRemoveProgressBar.style.width = `${percentage}%`;
        this.bgRemoveProgressText.textContent = `Removing background... ${Math.round(percentage)}%`;
    }

    async vectorizeImage(file) {
        try {
            console.log('Starting vectorization for file:', file.name, 'Size:', file.size);
            
            // Create FormData for the proxy server
            const formData = new FormData();
            formData.append('image', file);
            
            console.log('Vectorizer API endpoint:', this.vectorizerEndpoint);
            
            // Make API call to local proxy server
            const response = await fetch(this.vectorizerEndpoint, {
                method: 'POST',
                body: formData
            });
            
            console.log('Vectorizer API response status:', response.status);
            console.log('Vectorizer API response headers:', response.headers);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Vectorizer API error response:', errorText);
                throw new Error(`Vectorization API call failed: ${response.status} - ${response.statusText} - ${errorText}`);
            }
            
            // Get the response as blob (vectorized image)
            const vectorBlob = await response.blob();
            console.log('Vectorizer API response blob size:', vectorBlob.size);
            const vectorUrl = URL.createObjectURL(vectorBlob);
            
            return {
                success: true,
                vectorUrl: vectorUrl,
                originalUrl: URL.createObjectURL(file)
            };
            
        } catch (error) {
            console.error('Vectorization API error:', error);
            throw error;
        }
    }

    async removeBackground(file) {
        try {
            console.log('Starting background removal for file:', file.name, 'Size:', file.size);
            
            // Create FormData for the proxy server
            const formData = new FormData();
            formData.append('image', file);
            
            console.log('Clipping Magic API endpoint:', this.clippingMagicEndpoint);
            
            // Make API call to local proxy server
            const response = await fetch(this.clippingMagicEndpoint, {
                method: 'POST',
                body: formData
            });
            
            console.log('Clipping Magic API response status:', response.status);
            console.log('Clipping Magic API response headers:', response.headers);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Clipping Magic API error response:', errorText);
                throw new Error(`Background removal API call failed: ${response.status} - ${response.statusText} - ${errorText}`);
            }
            
            // Get the response as blob (background removed image)
            const bgRemovedBlob = await response.blob();
            console.log('Clipping Magic API response blob size:', bgRemovedBlob.size);
            const bgRemovedUrl = URL.createObjectURL(bgRemovedBlob);
            
            return {
                success: true,
                bgRemovedUrl: bgRemovedUrl,
                originalUrl: URL.createObjectURL(file)
            };
            
        } catch (error) {
            console.error('Background removal API error:', error);
            throw error;
        }
    }

    // This method is no longer needed since we're using the real API
    // Keeping it for reference in case we need fallback functionality
    createMockVectorUrl(file) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 400;
        canvas.height = 300;
        
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Vectorized', canvas.width / 2, canvas.height / 2);
        
        return canvas.toDataURL();
    }

    showVectorizeResults(vectorData) {
        // Hide progress
        this.vectorizeProgress.classList.add('hidden');
        
        // Set vector image
        this.vectorizeResultImg.src = vectorData.vectorUrl;
        
        // Show result section
        this.vectorizeResult.classList.remove('hidden');
        this.vectorizeResult.classList.add('fade-in');
        
        // Scroll to results
        this.vectorizeResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    showBgRemoveResults(bgRemovedData) {
        // Hide progress
        this.bgRemoveProgress.classList.add('hidden');
        
        // Set background removed image
        this.bgRemoveResultImg.src = bgRemovedData.bgRemovedUrl;
        
        // Show result section
        this.bgRemoveResult.classList.remove('hidden');
        this.bgRemoveResult.classList.add('fade-in');
        
        // Scroll to results
        this.bgRemoveResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    showVectorizeError(message) {
        // Hide progress
        this.vectorizeProgress.classList.add('hidden');
        
        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message fade-in';
        errorDiv.textContent = message;
        
        this.vectorizeUploadArea.appendChild(errorDiv);
        
        // Remove error after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    showBgRemoveError(message) {
        // Hide progress
        this.bgRemoveProgress.classList.add('hidden');
        
        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message fade-in';
        errorDiv.textContent = message;
        
        this.bgRemoveUploadArea.appendChild(errorDiv);
        
        // Remove error after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    downloadVector() {
        // Create a download link for the vectorized image
        const link = document.createElement('a');
        link.href = this.vectorizeResultImg.src;
        link.download = 'vectorized-image.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    downloadBackgroundRemoved() {
        // Create a download link for the background removed image
        const link = document.createElement('a');
        link.href = this.bgRemoveResultImg.src;
        link.download = 'background-removed.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    resetVectorization() {
        // Reset all states
        this.vectorizeFileInput.value = '';
        this.vectorizeProgress.classList.add('hidden');
        this.vectorizeResult.classList.add('hidden');
        this.vectorizeProgressBar.style.width = '0%';
        this.vectorizeProgressText.textContent = 'Vectorizing...';
        
        // Remove any error messages
        const errorMessages = this.vectorizeUploadArea.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.remove());
        
        // Scroll back to upload area
        this.vectorizeUploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    resetBackgroundRemoval() {
        // Reset all states
        this.bgRemoveFileInput.value = '';
        this.bgRemoveProgress.classList.add('hidden');
        this.bgRemoveResult.classList.add('hidden');
        this.bgRemoveProgressBar.style.width = '0%';
        this.bgRemoveProgressText.textContent = 'Removing background...';
        
        // Remove any error messages
        const errorMessages = this.bgRemoveUploadArea.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.remove());
        
        // Scroll back to upload area
        this.bgRemoveUploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Real API integration methods (now implemented)
    async callVectorizerAPI(file) {
        const formData = new FormData();
        formData.append('image', file);
        
        const credentials = btoa(`${this.vectorizerApiId}:${this.vectorizerApiSecret}`);
        
        const response = await fetch(this.vectorizerEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Vectorizer API call failed: ${response.status}`);
        }
        
        return await response.blob();
    }

    async callClippingMagicAPI(file) {
        const formData = new FormData();
        formData.append('image', file);
        
        const credentials = btoa(`${this.clippingMagicApiId}:${this.clippingMagicApiSecret}`);
        
        const response = await fetch(this.clippingMagicEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Clipping Magic API call failed: ${response.status}`);
        }
        
        return await response.blob();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DTFEditorApp();
});

// Add some additional utility functions
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
    }
};

// Export for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VectorizerApp, utils };
} 