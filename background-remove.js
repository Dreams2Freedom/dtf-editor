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
        this.error = document.getElementById('bgRemoveError');
        this.errorText = document.getElementById('bgRemoveErrorText');
        this.errorRetryBtn = document.getElementById('bgRemoveErrorRetryBtn');
        this.result = document.getElementById('bgRemoveResult');
        this.original = document.getElementById('bgRemoveOriginal');
        this.resultImg = document.getElementById('bgRemoveResultImg');
        this.downloadBtn = document.getElementById('bgRemoveDownloadBtn');
        this.newBtn = document.getElementById('bgRemoveNewBtn');
        
        // API configuration
        this.clippingMagicUploadEndpoint = '/api/clipping-magic-upload';
        
        // Mobile detection
        this.isMobile = this.detectMobile();
        console.log('Mobile device detected:', this.isMobile);
        
        // Store current file for retry
        this.currentFile = null;
        
        this.init();
    }

    detectMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
        return mobileRegex.test(userAgent) || window.innerWidth <= 768;
    }

    init() {
        console.log('BackgroundRemoveApp init called');
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.updateUIForMobile();
    }

    updateUIForMobile() {
        if (this.isMobile) {
            // Add mobile-specific UI updates
            console.log('Updating UI for mobile device');
            
            // Update upload area text for mobile
            const uploadText = this.uploadArea.querySelector('p');
            if (uploadText) {
                uploadText.textContent = 'Tap to select an image from your phone';
            }
            
            // Add mobile-specific instructions
            const mobileInstructions = document.createElement('div');
            mobileInstructions.className = 'mt-4 p-3 bg-blue-50 rounded-lg';
            mobileInstructions.innerHTML = `
                <p class="text-sm text-blue-800">
                    <strong>Mobile Instructions:</strong><br>
                    1. Tap the upload area above<br>
                    2. Select an image from your photo library<br>
                    3. The background removal editor will open<br>
                    4. Use the editor tools to refine the result<br>
                    5. Tap "Done" when finished
                </p>
            `;
            this.uploadArea.appendChild(mobileInstructions);
        }
    }

    setupEventListeners() {
        // Flag to prevent multiple simultaneous processing
        this.isProcessing = false;

        // File input change handler
        this.fileInput.addEventListener('change', (e) => {
            console.log('File input change event triggered');
            const file = e.target.files[0];
            if (file && !this.isProcessing) {
                this.isProcessing = true;
                // Check authentication before processing
                if (window.paywallModal && window.paywallModal.showIfNotAuthenticated('background-remove')) {
                    // Paywall was shown, don't process the file
                    this.fileInput.value = ''; // Clear the file input
                    this.isProcessing = false;
                    return;
                }
                console.log('File selected:', file.name, file.size, file.type);
                this.currentFile = file; // Store for potential retry
                this.handleBackgroundRemoval(file);
            }
        });

        // Upload area click handler
        this.uploadArea.addEventListener('click', (e) => {
            // Prevent duplicate triggers
            if (this.isProcessing) {
                console.log('Already processing, ignoring click');
                return;
            }
            
            // Check authentication before opening file dialog
            if (window.paywallModal && window.paywallModal.showIfNotAuthenticated('background-remove')) {
                return; // Paywall was shown, don't open file dialog
            }
            this.fileInput.click();
        });

        // Add touch handler for mobile devices - but prevent duplicate triggers
        this.uploadArea.addEventListener('touchend', (e) => {
            // Prevent duplicate triggers
            if (this.isProcessing) {
                console.log('Already processing, ignoring touch');
                return;
            }
            
            console.log('Upload area touched');
            e.preventDefault();
            e.stopPropagation();
            
            // Check authentication before opening file dialog
            if (window.paywallModal && window.paywallModal.showIfNotAuthenticated('background-remove')) {
                return; // Paywall was shown, don't open file dialog
            }
            
            // Trigger file input click
            console.log('Triggering file input click from touch');
            this.fileInput.click();
        });

        // Error retry button
        this.errorRetryBtn.addEventListener('click', () => {
            console.log('Retry button clicked');
            this.hideError();
            if (this.currentFile) {
                this.handleBackgroundRemoval(this.currentFile);
            } else {
                // If no current file, reset to upload state
                this.resetBackgroundRemoval();
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
        // Call the original setupDragAndDrop with authentication check
        utils.setupDragAndDrop(this.uploadArea, this.fileInput, (file) => {
            console.log('Drag and drop callback triggered');
            // Check authentication before processing
            if (window.paywallModal && window.paywallModal.showIfNotAuthenticated('background-remove')) {
                return; // Paywall was shown, don't process the file
            }
            this.handleBackgroundRemoval(file);
        });
        
        // Add additional mobile-specific handling
        if (this.isMobile) {
            console.log('Adding mobile-specific drag and drop handling');
            
            // Ensure the upload area is clickable on mobile
            this.uploadArea.style.cursor = 'pointer';
            this.uploadArea.style.userSelect = 'none';
            this.uploadArea.style.webkitUserSelect = 'none';
            this.uploadArea.style.webkitTouchCallout = 'none';
            
            // Add visual feedback for mobile
            this.uploadArea.addEventListener('touchstart', () => {
                this.uploadArea.style.opacity = '0.7';
            });
            
            this.uploadArea.addEventListener('touchend', () => {
                this.uploadArea.style.opacity = '1';
            });
        }
    }

    async handleBackgroundRemoval(file) {
        try {
            console.log('=== BACKGROUND REMOVAL STARTED ===');
            console.log('Starting background removal with editor for file:', file.name);
            console.log('File size:', file.size, 'bytes');
            console.log('File type:', file.type);
            console.log('Mobile device:', this.isMobile);
            console.log('User agent:', navigator.userAgent);
            console.log('Current URL:', window.location.href);
            
            // Check authentication first - show paywall instead of redirecting
            if (!window.authUtils || !window.authUtils.isAuthenticated()) {
                console.log('User not authenticated, showing paywall');
                if (window.paywallModal && window.paywallModal.showIfNotAuthenticated('background-remove')) {
                    this.isProcessing = false; // Reset processing flag
                    return; // Paywall was shown, don't process the file
                }
                // Fallback if paywall is not available
                this.showError('Please log in to use the background removal feature.');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                this.isProcessing = false; // Reset processing flag
                return;
            }
            
            console.log('User is authenticated, proceeding with file validation');
            
            // Validate file with mobile-specific options
            if (!utils.validateFile(file, { isMobile: this.isMobile })) {
                console.log('File validation failed - showing error notification');
                this.isProcessing = false; // Reset processing flag
                return; // The validateFile function already shows the error notification
            }
            
            console.log('File validation passed');
            
            // Show original image preview
            this.showOriginalPreview(file);
            console.log('Original preview shown');
            
            // Store original URL for later use
            this.currentOriginalUrl = URL.createObjectURL(file);
            console.log('Original URL created:', this.currentOriginalUrl);
            
            // Show progress
            this.showProgress();
            console.log('Progress shown');
            
            // Upload to Clipping Magic and get credentials
            console.log('Starting Clipping Magic upload...');
            const uploadResult = await this.uploadToClippingMagic(file);
            console.log('Upload completed:', uploadResult);
            
            // Complete progress
            this.updateProgress(100);
            console.log('Progress updated to 100%');
            
            // Check if we're on mobile and show mobile-specific message
            if (this.isMobile) {
                this.progressText.textContent = 'Opening editor on mobile... This may take a moment.';
                utils.showNotification('Opening background removal editor...', 'info');
                console.log('Mobile-specific message shown');
            }
            
            // Launch the editor
            console.log('Launching Clipping Magic editor...');
            await this.launchClippingMagicEditor(uploadResult.id, uploadResult.secret, uploadResult.apiId);
            console.log('Editor launch completed');
            
        } catch (error) {
            console.error('=== BACKGROUND REMOVAL ERROR ===');
            console.error('Background removal with editor error:', error);
            console.error('Error stack:', error.stack);
            
            // Handle specific error types
            if (error.message.includes('Authentication required') || error.message.includes('Please log in')) {
                console.log('Authentication error, showing paywall');
                // Show paywall instead of redirecting
                if (window.paywallModal && window.paywallModal.showIfNotAuthenticated('background-remove')) {
                    this.isProcessing = false; // Reset processing flag
                    return; // Paywall was shown
                }
                // Fallback if paywall is not available
                this.showError('Please log in to use this feature.');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else if (error.message.includes('Insufficient credits')) {
                console.log('Insufficient credits error, redirecting to dashboard');
                this.showError(error.message);
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 3000);
            } else if (this.isMobile && error.message.includes('Failed to load ClippingMagic script')) {
                console.log('Mobile library load error');
                this.showError('The background removal editor may not be compatible with your mobile browser. Please try using a desktop computer or a different mobile browser.');
            } else if (error.message.includes('File is too large')) {
                console.log('File size error - already handled by validation');
                // Error already shown by validateFile function
            } else if (error.message.includes('File type')) {
                console.log('File type error - already handled by validation');
                // Error already shown by validateFile function
            } else {
                console.log('Generic error, showing fallback message');
                this.showError('Failed to start background removal editor. Please try again.');
            }
        } finally {
            // Always reset the processing flag
            this.isProcessing = false;
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
            
            // Update progress to show upload starting
            this.updateProgress(10);
            this.progressText.textContent = 'Uploading image to server...';
     
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
                
                // Update progress to show error
                this.updateProgress(0);
                this.progressText.textContent = 'Upload failed';
                
                if (response.status === 401) {
                    throw new Error('Authentication required. Please log in to use this feature.');
                } else if (response.status === 402) {
                    const errorData = JSON.parse(errorText);
                    throw new Error(`Insufficient credits. You have ${errorData.credits_remaining} credits remaining.`);
                } else if (response.status === 413) {
                    throw new Error('File is too large for processing. Please use a smaller image.');
                } else if (response.status === 400) {
                    throw new Error('Invalid file format. Please upload a valid image file (PNG, JPG, or GIF).');
                } else if (response.status >= 500) {
                    throw new Error('Server error. Please try again in a few moments.');
                } else {
                    throw new Error(`Upload failed: ${response.status} - ${response.statusText}`);
                }
            }
            
            const result = await response.json();
            console.log('Clipping Magic upload successful:', result);
            
            // Update progress to show upload complete
            this.updateProgress(50);
            this.progressText.textContent = 'Upload complete, preparing editor...';
            
            return {
                success: true,
                id: result.id,
                secret: result.secret,
                apiId: result.apiId,
                message: result.message
            };
            
        } catch (error) {
            console.error('Clipping Magic upload error:', error);
            
            // Update progress to show error
            this.updateProgress(0);
            this.progressText.textContent = 'Upload failed';
            
            throw error;
        }
    }

    async downloadClippingMagicResult(imageId, imageSecret) {
        try {
            console.log('Downloading Clipping Magic result for image:', imageId);
            
            // Get authentication token
            const token = window.authUtils ? window.authUtils.getAuthToken() : null;
            if (!token) {
                throw new Error('Authentication required. Please log in to use this feature.');
            }
            
            // Make API call to download endpoint
            const response = await fetch(`/api/clipping-magic-download`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    imageId: imageId,
                    imageSecret: imageSecret
                })
            });
            
            console.log('Clipping Magic download response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Clipping Magic download error response:', errorText);
                throw new Error(`Failed to download result: ${response.status} - ${response.statusText}`);
            }
            
            // Get the image as blob
            const imageBlob = await response.blob();
            console.log('Clipping Magic download successful, blob size:', imageBlob.size);
            
            // Create object URL for the image
            const imageUrl = URL.createObjectURL(imageBlob);
            return imageUrl;
            
        } catch (error) {
            console.error('Clipping Magic download error:', error);
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

            // Mobile-specific timeout (mobile browsers may be slower)
            const timeout = this.isMobile ? 30000 : 15000; // 30 seconds for mobile, 15 for desktop
            
            const timeoutId = setTimeout(() => {
                console.error('ClippingMagic library load timeout');
                reject(new Error('Library load timeout - please try again'));
            }, timeout);

            // First, let's try to fetch the script to see if it's accessible
            console.log('Testing script URL accessibility...');
            fetch('https://clippingmagic.com/api/v1/ClippingMagic.js', { 
                method: 'HEAD',
                mode: 'no-cors' // This allows cross-origin requests but with limited info
            })
            .then(() => {
                console.log('Script URL appears to be accessible');
            })
            .catch(error => {
                console.warn('Script URL fetch test failed:', error);
            });

            // Create script element
            const script = document.createElement('script');
            script.src = 'https://clippingmagic.com/api/v1/ClippingMagic.js';
            script.async = true;
            script.crossOrigin = 'anonymous'; // Add crossOrigin attribute
            
            // Add additional debugging
            script.onload = () => {
                console.log('ClippingMagic script onload event fired');
                console.log('Script readyState:', script.readyState);
                console.log('Window.ClippingMagic immediately after load:', window.ClippingMagic);
                
                // Wait a bit for the library to initialize
                let attempts = 0;
                const maxAttempts = this.isMobile ? 100 : 50; // More attempts for mobile
                
                const checkLibrary = () => {
                    console.log(`Checking for ClippingMagic library... attempt ${attempts + 1}`);
                    console.log('typeof window.ClippingMagic:', typeof window.ClippingMagic);
                    console.log('window.ClippingMagic:', window.ClippingMagic);
                    
                    if (typeof window.ClippingMagic !== 'undefined') {
                        console.log('ClippingMagic library initialized successfully!');
                        clearTimeout(timeoutId);
                        resolve();
                    } else if (attempts < maxAttempts) {
                        attempts++;
                        setTimeout(checkLibrary, this.isMobile ? 200 : 100); // Slower for mobile
                    } else {
                        console.error('ClippingMagic library failed to initialize after script load');
                        console.error('Final check - window.ClippingMagic:', window.ClippingMagic);
                        console.error('All window properties:', Object.keys(window));
                        clearTimeout(timeoutId);
                        reject(new Error('ClippingMagic library failed to initialize'));
                    }
                };
                
                checkLibrary();
            };
            
            script.onerror = (error) => {
                console.error('Failed to load ClippingMagic script - onerror event:', error);
                console.error('Script src:', script.src);
                console.error('Script readyState:', script.readyState);
                clearTimeout(timeoutId);
                reject(new Error('Failed to load ClippingMagic script'));
            };
            
            // Add to head
            document.head.appendChild(script);
            console.log('ClippingMagic script added to DOM');
            console.log('Script element:', script);
        });
    }

    async launchClippingMagicEditor(id, secret, apiId) {
        try {
            console.log('Launching Clipping Magic editor with ID:', id, 'Secret:', secret, 'API ID:', apiId);
            console.log('Mobile device:', this.isMobile);
            
            // Load the ClippingMagic library
            await this.loadClippingMagicLibrary();
            
            console.log('ClippingMagic library available:', typeof ClippingMagic !== 'undefined');
            console.log('Window.ClippingMagic:', window.ClippingMagic);
            
            // Final check if Clipping Magic library is loaded
            if (typeof ClippingMagic === 'undefined') {
                console.error('ClippingMagic library not loaded!');
                console.error('Available scripts:', Array.from(document.scripts).map(s => s.src));
                
                if (this.isMobile) {
                    this.showError('The background removal editor is not compatible with your mobile browser. Please try using a desktop computer or a different mobile browser (Chrome or Safari recommended).');
                } else {
                    this.showError('Background removal editor failed to load. Please refresh the page and try again.');
                }
                return;
            }
            
            // Hide progress and show that editor is launching
            this.progress.classList.add('hidden');
            
            if (this.isMobile) {
                utils.showNotification('Opening mobile editor... Please wait.', 'info');
            } else {
                utils.showNotification('Launching background removal editor...', 'info');
            }
            
            // Use the API ID from the upload response
            console.log('Using API ID from upload response:', apiId);
            
            // Set API ID as global variable (some libraries expect this)
            window.CLIPPING_MAGIC_API_ID = apiId;
            
            // Initialize ClippingMagic with the real API ID (must be number)
            console.log('Initializing ClippingMagic with API ID:', apiId, 'Type:', typeof apiId);
            const errorsArray = ClippingMagic.initialize({apiId: Number(apiId)});
            console.log('ClippingMagic.initialize result:', errorsArray);
            
            if (errorsArray.length > 0) {
                console.error('Browser compatibility errors:', errorsArray);
                
                if (this.isMobile) {
                    this.showError('Your mobile browser is missing required features for the background removal editor. Please try using Chrome or Safari, or use a desktop computer.');
                } else {
                    this.showError('Sorry, your browser is missing some required features: ' + errorsArray.join(', '));
                }
                return;
            }
            
            // Mobile-specific editor configuration
            const editorConfig = {
                image: {
                    id: id,
                    secret: secret
                },
                useStickySettings: true,
                hideBottomToolbar: false,
                locale: 'en-US'
            };
            
            // Add mobile-specific options
            if (this.isMobile) {
                editorConfig.mobile = true;
                editorConfig.touchEnabled = true;
                console.log('Using mobile-specific editor configuration');
            }
            
            // Launch the White Label Smart Editor
            ClippingMagic.edit(editorConfig, (opts) => {
                console.log('Editor callback triggered:', opts);
                this.handleEditorCallback(opts);
            });
            
        } catch (error) {
            console.error('Failed to launch Clipping Magic editor:', error);
            
            if (this.isMobile) {
                this.showError('Failed to launch background removal editor on mobile. Please try using a desktop computer or a different mobile browser.');
            } else {
                this.showError('Failed to launch background removal editor. Please try again.');
            }
        }
    }

    async handleEditorCallback(opts) {
        console.log('Editor callback - Event:', opts.event, 'Data:', opts);
        
        switch (opts.event) {
            case 'result-generated':
                console.log('Result generated for image:', opts.image.id);
                utils.showNotification('Downloading background-removed image...', 'info');
                
                try {
                    console.log('Starting download of result for image:', opts.image.id);
                    
                    // Download the processed image from ClippingMagic API
                    const result = await this.downloadClippingMagicResult(opts.image.id, opts.image.secret);
                    console.log('Download completed, result URL:', result);
                    
                    // Show the result
                    console.log('Calling showResults with:', {
                        success: true,
                        bgRemovedUrl: result,
                        originalUrl: this.currentOriginalUrl
                    });
                    
                    this.showResults({
                        success: true,
                        bgRemovedUrl: result,
                        originalUrl: this.currentOriginalUrl
                    });
                    
                    utils.showNotification('Background removed successfully!', 'success');
                } catch (error) {
                    console.error('Failed to download result:', error);
                    this.showError('Failed to download the background-removed image. Please try again.');
                }
                break;
                
            case 'editor-exit':
                console.log('Editor closed');
                utils.showNotification('Background removal editor closed.', 'info');
                this.resetBackgroundRemoval();
                break;
                
            case 'error':
                console.error('Editor error:', opts.error);
                this.showError('An error occurred in the background removal editor: ' + opts.error.message);
                this.resetBackgroundRemoval();
                break;
                
            default:
                console.log('Unknown editor event:', opts.event);
                break;
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
        console.log('showResults called with data:', bgRemovedData);
        
        // Hide progress
        this.progress.classList.add('hidden');
        console.log('Progress hidden');
        
        // Set background removed image
        console.log('Setting result image src to:', bgRemovedData.bgRemovedUrl);
        this.resultImg.src = bgRemovedData.bgRemovedUrl;
        
        // Show result section
        console.log('Showing result section, current classes:', this.result.className);
        this.result.classList.remove('hidden');
        this.result.classList.add('fade-in');
        console.log('Result section classes after update:', this.result.className);
        
        // Scroll to results
        this.result.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log('Scrolled to results');
    }

    showError(message) {
        console.log('Showing error:', message);
        
        // Hide progress
        this.progress.classList.add('hidden');
        
        // Show error display
        this.errorText.textContent = message;
        this.error.classList.remove('hidden');
        
        // Scroll to error
        this.error.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Also show notification for immediate feedback
        utils.showNotification(message, 'error');
    }

    hideError() {
        this.error.classList.add('hidden');
        this.errorText.textContent = '';
        this.errorRetryBtn.classList.add('hidden');
    }

    downloadBackgroundRemoved() {
        utils.downloadFile(this.resultImg.src, 'background-removed.png');
    }

    resetBackgroundRemoval() {
        // Reset all states
        this.fileInput.value = '';
        this.progress.classList.add('hidden');
        this.error.classList.add('hidden');
        this.result.classList.add('hidden');
        this.progressBar.style.width = '0%';
        this.progressText.textContent = 'Processing...';
        this.errorText.textContent = '';
        
        // Clear current file
        this.currentFile = null;
        
        // Scroll back to upload area
        this.uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.backgroundRemoveApp = new BackgroundRemoveApp();
});
