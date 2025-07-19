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
        
        // Debug element finding
        console.log('Elements found:', {
            uploadArea: !!this.uploadArea,
            fileInput: !!this.fileInput,
            progress: !!this.progress,
            progressBar: !!this.progressBar,
            progressText: !!this.progressText,
            result: !!this.result,
            original: !!this.original,
            resultImg: !!this.resultImg,
            downloadBtn: !!this.downloadBtn,
            newBtn: !!this.newBtn
        });
        
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
            const file = e.target.files[0];
            if (file) {
                // Check authentication before processing
                if (window.paywallModal && window.paywallModal.showIfNotAuthenticated('vectorize')) {
                    // Paywall was shown, don't process the file
                    this.fileInput.value = ''; // Clear the file input
                    return;
                }
                this.handleVectorization(file);
            }
        });

        this.uploadArea.addEventListener('click', () => {
            // Check authentication before opening file dialog
            if (window.paywallModal && window.paywallModal.showIfNotAuthenticated('vectorize')) {
                return; // Paywall was shown, don't open file dialog
            }
            this.fileInput.click();
        });

        this.downloadBtn.addEventListener('click', () => {
            this.downloadVector();
        });

        this.newBtn.addEventListener('click', () => {
            this.resetVectorization();
        });
    }

    setupDragAndDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, () => {
                this.uploadArea.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, () => {
                this.uploadArea.classList.remove('dragover');
            }, false);
        });

        this.uploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                // Check authentication before processing
                if (window.paywallModal && window.paywallModal.showIfNotAuthenticated('vectorize')) {
                    return; // Paywall was shown, don't process the file
                }
                this.handleVectorization(files[0]);
            }
        }, false);
    }

    async handleVectorization(file) {
        console.log('handleVectorization called with file:', file);
        
        // Check authentication first - show paywall instead of redirecting
        if (!window.authUtils || !window.authUtils.isAuthenticated()) {
            if (window.paywallModal && window.paywallModal.showIfNotAuthenticated('vectorize')) {
                return; // Paywall was shown, don't process the file
            }
            // Fallback if paywall is not available
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
                // Show paywall instead of redirecting
                if (window.paywallModal && window.paywallModal.showIfNotAuthenticated('vectorize')) {
                    return; // Paywall was shown
                }
                // Fallback if paywall is not available
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
            
            // Get the response as JSON
            const previewData = await response.json();
            console.log('Preview API response data:', previewData);
            
            if (!previewData.success) {
                throw new Error(previewData.error || 'Preview generation failed');
            }
            
            return {
                success: true,
                previewUrl: previewData.previewUrl,
                originalUrl: URL.createObjectURL(file)
            };
            
        } catch (error) {
            console.error('Preview generation API error:', error);
            throw error;
        }
    }

    showPreviewResults(previewData) {
        console.log('showPreviewResults called with:', previewData);
        
        // Hide progress
        this.progress.classList.add('hidden');
        
        // Check if resultImg element exists
        if (!this.resultImg) {
            console.error('resultImg element not found!');
            this.showError('Failed to display preview - element not found');
            return;
        }
        
        // Set preview image directly (now it's a data URL)
        console.log('Setting resultImg.src to:', previewData.previewUrl);
        this.resultImg.src = previewData.previewUrl;
        
        // Add error handling for image load
        this.resultImg.onerror = (e) => {
            console.error('Failed to load preview image:', e);
            this.showError('Failed to load preview image');
        };
        
        this.resultImg.onload = () => {
            console.log('Preview image loaded successfully');
        };
        
        // Check if result element exists
        if (!this.result) {
            console.error('result element not found!');
            this.showError('Failed to display results - element not found');
            return;
        }
        
        // Show result section
        this.result.classList.remove('hidden');
        this.result.classList.add('fade-in');
        
        // Scroll to results
        this.result.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        console.log('Preview results displayed successfully');
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
