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
            
            // Check authentication first
            if (!window.authUtils || !window.authUtils.isAuthenticated()) {
                this.showError('Please log in to use the background removal feature.');
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
            
            // Store original URL for later use
            this.currentOriginalUrl = URL.createObjectURL(file);
            
            // Show progress
            this.showProgress();
            
            // Upload to Clipping Magic and get credentials
            const uploadResult = await this.uploadToClippingMagic(file);
            
            // Complete progress
            this.updateProgress(100);
            
            // Launch the editor
            await this.launchClippingMagicEditor(uploadResult.id, uploadResult.secret);
            
        } catch (error) {
            console.error('Background removal with editor error:', error);
            
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
                this.showError('Failed to start background removal editor. Please try again.');
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
        this.progressText.textContent = 'Uploading to editor...';
    }

    updateProgress(percentage) {
        this.progressBar.style.width = `${percentage}%`;
        this.progressText.textContent = `Processing... ${Math.round(percentage)}%`;
    }

    async uploadToClippingMagic(file) {
        try {
            console.log('Starting Clipping Magic upload for file:', file.name, 'Size:', file.size);
            
            // Get authentication token
            const token = window.authUtils ? window.authUtils.getAuthToken() : null;
            if (!token) {
                throw new Error('Authentication required. Please log in to use this feature.');
            }
            
            // Create FormData for the upload endpoint
            const formData = new FormData();
            formData.append('image', file);
            
            console.log('Clipping Magic upload endpoint:', this.clippingMagicUploadEndpoint);
            
            // Make API call to upload endpoint with authentication
            const headers = {
                'Authorization': `Bearer ${token}`
            };
            
            const response = await fetch(this.clippingMagicUploadEndpoint, {
                method: 'POST',
                headers: headers,
                body: formData
            });
            
            console.log('Clipping Magic upload response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Clipping Magic upload error response:', errorText);
                
                if (response.status === 401) {
                    throw new Error('Authentication required. Please log in to use this feature.');
                } else if (response.status === 402) {
                    const errorData = JSON.parse(errorText);
                    throw new Error(`Insufficient credits. You have ${errorData.credits_remaining} credits remaining.`);
                } else {
                    throw new Error(`Clipping Magic upload failed: ${response.status} - ${response.statusText} - ${errorText}`);
                }
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

    async loadClippingMagicLibrary() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (typeof window.ClippingMagic !== 'undefined') {
                console.log('ClippingMagic library already loaded');
                resolve();
                return;
            }

            // Create script element
            const script = document.createElement('script');
            script.src = 'https://static.clippingmagic.com/js/wl-editor.js';
            script.async = true;
            
            script.onload = () => {
                console.log('ClippingMagic script loaded successfully');
                
                // Wait a bit for the library to initialize
                let attempts = 0;
                const maxAttempts = 50;
                
                const checkLibrary = () => {
                    if (typeof window.ClippingMagic !== 'undefined') {
                        console.log('ClippingMagic library initialized');
                        resolve();
                    } else if (attempts < maxAttempts) {
                        attempts++;
                        console.log(`Waiting for ClippingMagic library initialization... attempt ${attempts}`);
                        setTimeout(checkLibrary, 100);
                    } else {
                        console.error('ClippingMagic library failed to initialize after script load');
                        reject(new Error('ClippingMagic library failed to initialize'));
                    }
                };
                
                checkLibrary();
            };
            
            script.onerror = (error) => {
                console.error('Failed to load ClippingMagic script:', error);
                reject(new Error('Failed to load ClippingMagic script'));
            };
            
            // Add to head
            document.head.appendChild(script);
            console.log('ClippingMagic script added to DOM');
        });
    }

    async launchClippingMagicEditor(id, secret) {
        try {
            console.log('Launching Clipping Magic editor with ID:', id, 'Secret:', secret);
            
            // Load the ClippingMagic library
            await this.loadClippingMagicLibrary();
            
            console.log('ClippingMagic library available:', typeof ClippingMagic !== 'undefined');
            console.log('Window.ClippingMagic:', window.ClippingMagic);
            
            // Final check if Clipping Magic library is loaded
            if (typeof ClippingMagic === 'undefined') {
                console.error('ClippingMagic library not loaded!');
                console.error('Available scripts:', Array.from(document.scripts).map(s => s.src));
                this.showError('Background removal editor failed to load. Please refresh the page and try again.');
                return;
            }
            
            // Hide progress and show that editor is launching
            this.progress.classList.add('hidden');
            utils.showNotification('Launching background removal editor...', 'info');
            
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
            this.showError('Failed to launch background removal editor. Please try again.');
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
