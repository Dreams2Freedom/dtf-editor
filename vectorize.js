// DTF Editor - Vectorization Tool

class VectorizeApp {
    constructor() {
        console.log('VectorizeApp constructor called');
        
        // Elements
        this.uploadArea = document.getElementById('vectorizeUploadArea');
        this.fileInput = document.getElementById('vectorize-file-upload');
        this.progress = document.getElementById('vectorizeProgress');
        this.progressBar = document.getElementById('vectorizeProgressBar');
        this.progressText = document.getElementById('vectorizeProgressText');
        this.result = document.getElementById('vectorizeResult');
        this.original = document.getElementById('vectorizeOriginal');
        this.resultImg = document.getElementById('vectorizeResultImg');
        this.downloadBtn = document.getElementById('vectorizeDownloadBtn');
        this.newBtn = document.getElementById('vectorizeNewBtn');
        
        // API configuration
        this.vectorizerEndpoint = '/api/vectorize';
        this.previewEndpoint = '/api/preview';
        
        this.init();
    }

    init() {
        console.log('VectorizeApp init called');
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        this.fileInput.addEventListener('change', (e) => {
            console.log('File input change event triggered');
            console.log('Files selected:', e.target.files);
            const file = e.target.files[0];
            if (file) {
                this.handleVectorization(file);
            }
        });

        this.downloadBtn.addEventListener('click', () => {
            this.downloadVector();
        });

        this.newBtn.addEventListener('click', () => {
            this.resetVectorization();
        });
    }

    setupDragAndDrop() {
        utils.setupDragAndDrop(this.uploadArea, this.fileInput, (file) => {
            this.handleVectorization(file);
        });
    }

    async handleVectorization(file) {
        console.log('handleVectorization called with file:', file);
        
        // Check authentication first
        if (!window.authUtils || !window.authUtils.isAuthenticated()) {
            this.showError('Please log in to use the vectorization feature.');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        // Validate file
        if (!utils.validateFile(file)) {
            return;
        }

        // Show original image preview
        this.showOriginalPreview(file);

        // Show progress
        this.showProgress();

        try {
            // Start progress simulation
            const progressInterval = utils.simulateProgress(this.progressBar, this.progressText);
            
            // Generate preview first
            const previewData = await this.generatePreview(file);
            
            // Complete progress
            this.updateProgress(100);
            
            // Show preview results with paywall
            this.showPreviewResults(previewData);
        } catch (error) {
            console.error('Vectorization error:', error);
            
            // Handle specific error types
            if (error.message.includes('Authentication required') || error.message.includes('Please log in')) {
                this.showError('Please log in to use this feature.');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else if (error.message.includes('Insufficient credits')) {
                this.showError(error.message);
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 3000);
            } else {
                this.showError('Failed to vectorize image. Please try again.');
            }
        }
    }

    showOriginalPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.original.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    showProgress() {
        this.progress.classList.remove('hidden');
        this.progressBar.style.width = '0%';
        this.progressText.textContent = 'Vectorizing...';
    }

    updateProgress(percentage) {
        this.progressBar.style.width = `${percentage}%`;
        this.progressText.textContent = `Vectorizing... ${Math.round(percentage)}%`;
    }

    async generatePreview(file) {
        try {
            console.log('Starting preview generation for file:', file.name, 'Size:', file.size);
            
            // Get authentication token
            const token = window.authUtils ? window.authUtils.getAuthToken() : null;
            if (!token) {
                throw new Error('Authentication required. Please log in to use this feature.');
            }
            
            // Create FormData for the preview endpoint
            const formData = new FormData();
            formData.append('image', file);
            
            console.log('Preview API endpoint:', this.previewEndpoint);
            
            // Make API call to preview endpoint with authentication
            const headers = {
                'Authorization': `Bearer ${token}`
            };
            
            const response = await fetch(this.previewEndpoint, {
                method: 'POST',
                headers: headers,
                body: formData
            });
            
            console.log('Preview API response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Preview API error response:', errorText);
                
                if (response.status === 401) {
                    throw new Error('Authentication required. Please log in to use this feature.');
                } else if (response.status === 402) {
                    const errorData = JSON.parse(errorText);
                    throw new Error(`Insufficient credits. You have ${errorData.credits_remaining} credits remaining.`);
                } else {
                    throw new Error(`Preview API call failed: ${response.status} - ${response.statusText} - ${errorText}`);
                }
            }
            
            // Get the response as blob (preview image)
            const previewBlob = await response.blob();
            console.log('Preview API response blob size:', previewBlob.size);
            const previewUrl = URL.createObjectURL(previewBlob);
            
            return {
                success: true,
                previewUrl: previewUrl,
                originalUrl: URL.createObjectURL(file)
            };
            
        } catch (error) {
            console.error('Preview generation API error:', error);
            throw error;
        }
    }

    showPreviewResults(previewData) {
        // Hide progress
        this.progress.classList.add('hidden');
        
        // Set preview image
        this.resultImg.src = previewData.previewUrl;
        
        // Show result section
        this.result.classList.remove('hidden');
        this.result.classList.add('fade-in');
        
        // Scroll to results
        this.result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    showError(message) {
        // Hide progress
        this.progress.classList.add('hidden');
        
        // Show error message
        utils.showNotification(message, 'error');
    }

    downloadVector() {
        utils.downloadFile(this.resultImg.src, 'vectorized-image.svg');
    }

    resetVectorization() {
        // Reset all states
        this.fileInput.value = '';
        this.progress.classList.add('hidden');
        this.result.classList.add('hidden');
        this.progressBar.style.width = '0%';
        this.progressText.textContent = 'Vectorizing...';
        
        // Scroll back to upload area
        this.uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.vectorizeApp = new VectorizeApp();
});
