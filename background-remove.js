// DTF Editor - Background Removal Tool

class BackgroundRemoveApp {
    constructor() {
        console.log('BackgroundRemoveApp constructor called');
        
        // Elements
        this.uploadArea = document.getElementById('bgRemoveUploadArea');
        this.fileInput = document.getElementById('bg-remove-file-upload');
        this.progress = document.getElementById('bgRemoveProgress');
        this.progressBar = document.getElementById('bgRemoveProgressBar');
        this.progressText = document.getElementById('bgRemoveProgressText');
        this.result = document.getElementById('bgRemoveResult');
        this.original = document.getElementById('bgRemoveOriginal');
        this.resultImg = document.getElementById('bgRemoveResultImg');
        this.downloadBtn = document.getElementById('bgRemoveDownloadBtn');
        this.newBtn = document.getElementById('bgRemoveNewBtn');
        
        // API configuration
        this.clippingMagicUploadEndpoint = '/api/clipping-magic-upload';
        
        this.init();
    }

    init() {
        console.log('BackgroundRemoveApp init called');
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleBackgroundRemoval(file);
            }
        });

        this.downloadBtn.addEventListener('click', () => {
            this.downloadBackgroundRemoved();
        });

        this.newBtn.addEventListener('click', () => {
            this.resetBackgroundRemoval();
        });
    }

    setupDragAndDrop() {
        utils.setupDragAndDrop(this.uploadArea, this.fileInput, (file) => {
            this.handleBackgroundRemoval(file);
        });
    }

    async handleBackgroundRemoval(file) {
        try {
            console.log('Starting background removal with editor for file:', file.name);
            
            // Validate file
            if (!utils.validateFile(file)) {
                return;
            }
            
            // Show original image preview
            this.showOriginalPreview(file);
            
            // Store original URL for later use
            this.currentOriginalUrl = URL.createObjectURL(file);
            
            // Show progress
            this.showProgress();
            
            // Upload to Clipping Magic and get credentials
            const uploadResult = await this.uploadToClippingMagic(file);
            
            // Complete progress
            this.updateProgress(100);
            
            // Launch the editor
            this.launchClippingMagicEditor(uploadResult.id, uploadResult.secret);
            
        } catch (error) {
            this.showError('Failed to start background removal editor. Please try again.');
            console.error('Background removal with editor error:', error);
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
        this.progressText.textContent = 'Uploading to editor...';
    }

    updateProgress(percentage) {
        this.progressBar.style.width = `${percentage}%`;
        this.progressText.textContent = `Processing... ${Math.round(percentage)}%`;
    }

    async uploadToClippingMagic(file) {
        try {
            console.log('Starting Clipping Magic upload for file:', file.name, 'Size:', file.size);
            
            // Create FormData for the upload endpoint
            const formData = new FormData();
            formData.append('image', file);
            
            console.log('Clipping Magic upload endpoint:', this.clippingMagicUploadEndpoint);
            
            // Make API call to upload endpoint
            const response = await fetch(this.clippingMagicUploadEndpoint, {
                method: 'POST',
                body: formData
            });
            
            console.log('Clipping Magic upload response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Clipping Magic upload error response:', errorText);
                throw new Error(`Clipping Magic upload failed: ${response.status} - ${response.statusText} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log('Clipping Magic upload successful:', result);
            
            return {
                success: true,
                id: result.id,
                secret: result.secret,
                message: result.message
            };
            
        } catch (error) {
            console.error('Clipping Magic upload error:', error);
            throw error;
        }
    }

    launchClippingMagicEditor(id, secret) {
        try {
            console.log('Launching Clipping Magic editor with ID:', id);
            
            // Check if Clipping Magic library is loaded
            if (typeof ClippingMagic === 'undefined') {
                throw new Error('Clipping Magic library not loaded. Please ensure the script is included.');
            }
            
            // Launch the White Label Smart Editor
            ClippingMagic.launch({
                id: id,
                secret: secret,
                onSave: (imageData) => {
                    console.log('Editor save callback triggered');
                    this.handleEditorSave(imageData);
                },
                onCancel: () => {
                    console.log('Editor cancel callback triggered');
                    this.handleEditorCancel();
                },
                onError: (error) => {
                    console.error('Editor error callback:', error);
                    this.handleEditorError(error);
                }
            });
            
        } catch (error) {
            console.error('Failed to launch Clipping Magic editor:', error);
            utils.showNotification('Failed to launch editor. Please try again.', 'error');
        }
    }

    handleEditorSave(imageData) {
        console.log('Editor save handler called with image data');
        
        // Create a blob URL from the image data
        const blob = new Blob([imageData], { type: 'image/png' });
        const imageUrl = URL.createObjectURL(blob);
        
        // Show the result
        this.showResults({
            success: true,
            bgRemovedUrl: imageUrl,
            originalUrl: this.currentOriginalUrl
        });
        
        utils.showNotification('Background removed successfully!', 'success');
    }

    handleEditorCancel() {
        console.log('Editor cancel handler called');
        utils.showNotification('Background removal cancelled', 'info');
        
        // Reset the background removal state
        this.resetBackgroundRemoval();
    }

    handleEditorError(error) {
        console.error('Editor error handler called:', error);
        utils.showNotification('Editor error: ' + error.message, 'error');
        
        // Reset the background removal state
        this.resetBackgroundRemoval();
    }

    showResults(bgRemovedData) {
        // Hide progress
        this.progress.classList.add('hidden');
        
        // Set background removed image
        this.resultImg.src = bgRemovedData.bgRemovedUrl;
        
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

    downloadBackgroundRemoved() {
        utils.downloadFile(this.resultImg.src, 'background-removed.png');
    }

    resetBackgroundRemoval() {
        // Reset all states
        this.fileInput.value = '';
        this.progress.classList.add('hidden');
        this.result.classList.add('hidden');
        this.progressBar.style.width = '0%';
        this.progressText.textContent = 'Processing...';
        
        // Scroll back to upload area
        this.uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.backgroundRemoveApp = new BackgroundRemoveApp();
});
