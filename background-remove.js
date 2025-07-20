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
        this.guestClippingMagicUploadEndpoint = '/api/clipping-magic-upload-guest';
        this.clippingMagicDownloadEndpoint = '/api/clipping-magic-download';
        this.guestClippingMagicDownloadEndpoint = '/api/clipping-magic-download-guest';
        
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
                // Allow processing without authentication - value-first approach
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
            
            // Allow file dialog without authentication - value-first approach
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
            
            // Allow file dialog without authentication - value-first approach
            
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

        this.downloadBtn.addEventListener('click', async () => {
            await this.downloadBackgroundRemoved();
        });

        this.newBtn.addEventListener('click', () => {
            this.resetBackgroundRemoval();
        });
    }

    setupDragAndDrop() {
        // Call the original setupDragAndDrop with value-first approach
        utils.setupDragAndDrop(this.uploadArea, this.fileInput, (file) => {
            console.log('Drag and drop callback triggered');
            // Allow processing without authentication - value-first approach
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
            
            // Value-first approach: Allow processing without authentication
            // Authentication will be required only for download
            
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
            
            // Upload to Clipping Magic and get credentials with retry mechanism
            console.log('Starting Clipping Magic upload...');
            const uploadResult = await utils.retryWithBackoff(async () => {
                return await this.uploadToClippingMagic(file);
            }, 3, 2000); // 3 retries, 2 second base delay
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
            
            // Check if user is authenticated
            const isAuthenticated = window.authUtils && window.authUtils.isAuthenticated();
            const token = isAuthenticated ? window.authUtils.getAuthToken() : null;
            
            // Create FormData for the upload endpoint
            const formData = new FormData();
            formData.append('image', file);
            
            // Use different endpoints for authenticated vs guest users
            const endpoint = isAuthenticated ? this.clippingMagicUploadEndpoint : this.guestClippingMagicUploadEndpoint;
            console.log('Clipping Magic upload endpoint:', endpoint);
            
            // Update progress to show upload starting
            this.updateProgress(10);
            this.progressText.textContent = 'Uploading image to server...';
     
            // Make API call to upload endpoint
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(endpoint, {
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
                
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: errorText };
                }
                
                if (response.status === 401) {
                    throw new Error('Authentication required. Please log in to use this feature.');
                } else if (response.status === 402) {
                    throw new Error(`Insufficient credits. You have ${errorData.credits_remaining} credits remaining.`);
                } else if (response.status === 413) {
                    throw new Error('File is too large for processing. Please use a smaller image.');
                } else if (response.status === 400) {
                    throw new Error('Invalid file format. Please upload a valid image file (PNG, JPG, or GIF).');
                } else if (response.status === 429 || errorData.errorCode === 'RATE_LIMITED') {
                    const retryAfter = errorData.retryAfter || '5 minutes';
                    throw new Error(`Service temporarily unavailable due to high demand. Please try again in ${retryAfter}.`);
                } else if (response.status === 503 || errorData.errorCode === 'SERVICE_UNAVAILABLE') {
                    throw new Error('Service temporarily unavailable. Please try again later.');
                } else if (response.status >= 500) {
                    throw new Error('Server error. Please try again in a few moments.');
                } else {
                    // Use the user-friendly error message from the server if available
                    const errorMessage = errorData.error || `Upload failed: ${response.status} - ${response.statusText}`;
                    throw new Error(errorMessage);
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
            
            // Check if user is authenticated
            const isAuthenticated = window.authUtils && window.authUtils.isAuthenticated();
            const token = isAuthenticated ? window.authUtils.getAuthToken() : null;
            
            // Use different endpoints for authenticated vs guest users
            const endpoint = isAuthenticated ? this.clippingMagicDownloadEndpoint : this.guestClippingMagicDownloadEndpoint;
            console.log('Clipping Magic download endpoint:', endpoint);
            
            // Make API call to download endpoint
            const headers = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
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
                
                // Check if user is authenticated
                const isAuthenticated = window.authUtils && window.authUtils.isAuthenticated();
                
                if (isAuthenticated) {
                    // Authenticated user - download immediately
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
                } else {
                    // Guest user - show signup modal
                    utils.showNotification('Background removal completed! Sign up to download your result.', 'success');
                    
                    // Store the image data for later download after signup
                    this.pendingDownloadData = {
                        imageId: opts.image.id,
                        imageSecret: opts.image.secret
                    };
                    
                    // Show signup modal
                    this.showSignupModal();
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

        // ---------- NEW GUEST CTA OVERLAY ----------
        if (!window.authUtils || !window.authUtils.isAuthenticated()) {
            // Create overlay only once
            if (!this.result.querySelector('.guest-cta-overlay')) {
                const overlay = document.createElement('div');
                overlay.className = 'guest-cta-overlay';
                overlay.style.cssText = `
                    position:absolute;
                    top:0;left:0;right:0;bottom:0;
                    background:rgba(0,0,0,0.55);
                    display:flex;flex-direction:column;align-items:center;justify-content:center;
                    color:#fff;border-radius:8px;gap:16px;text-align:center;padding:24px;`
                overlay.innerHTML = `
                    <p style="font-size:18px;font-weight:600;margin:0 0 8px;">Sign up to download full-resolution file</p>
                    <button id="guestDownloadSignupBtn" style="background:#E88B4B;border:none;padding:12px 24px;border-radius:6px;font-size:16px;font-weight:600;cursor:pointer;">Sign Up Free</button>
                `;
                // ensure result container position:relative
                this.result.style.position = 'relative';
                this.result.appendChild(overlay);

                overlay.querySelector('#guestDownloadSignupBtn').addEventListener('click', () => {
                    if (window.paywallModal) {
                        window.paywallModal.show('background-remove');
                    } else {
                        window.location.href = 'register.html';
                    }
                });
            }
        }
        // --------------------------------------------

        // Auto-store data (existing block)
        if (!window.authUtils || !window.authUtils.isAuthenticated()) {
            try {
                const imageData = {
                    original_url: this.currentOriginalUrl || null,
                    processed_url: bgRemovedData.bgRemovedUrl,
                    filename: 'background-removed.png',
                    type: 'background-remove',
                    timestamp: new Date().toISOString()
                };
                sessionStorage.setItem('processedImageData', JSON.stringify(imageData));
                localStorage.setItem('processedImageData', JSON.stringify(imageData));
                console.log('Auto-stored processed image data for guest user (showResults)');
            } catch (e) {
                console.error('Failed auto-store processed image data', e);
            }
        }
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

    async downloadBackgroundRemoved() {
        // Check if user is authenticated
        if (!window.authUtils || !window.authUtils.isAuthenticated()) {
            console.log('User not authenticated, preparing to store image data...');
            
            // Convert blob URLs to data URLs to persist through redirects
            let originalDataUrl = null;
            let processedDataUrl = null;
            
            try {
                // Convert original image to data URL
                if (this.originalImg && this.originalImg.src) {
                    console.log('Converting original image to data URL...');
                    originalDataUrl = await this.convertBlobToDataUrl(this.originalImg.src);
                    console.log('Original image converted to data URL');
                }
                
                // Convert processed image to data URL
                if (this.resultImg && this.resultImg.src) {
                    console.log('Converting processed image to data URL...');
                    processedDataUrl = await this.convertBlobToDataUrl(this.resultImg.src);
                    console.log('Processed image converted to data URL');
                }
                
                // Store the processed image data for post-signup page
                const imageData = {
                    original_url: originalDataUrl || (this.originalImg ? this.originalImg.src : null),
                    processed_url: processedDataUrl || (this.resultImg ? this.resultImg.src : null),
                    filename: 'background-removed.png',
                    type: 'background-remove',
                    timestamp: new Date().toISOString()
                };
                
                console.log('Prepared image data for storage:', {
                    hasOriginal: !!imageData.original_url,
                    hasProcessed: !!imageData.processed_url,
                    originalType: imageData.original_url ? imageData.original_url.substring(0, 30) + '...' : 'null',
                    processedType: imageData.processed_url ? imageData.processed_url.substring(0, 30) + '...' : 'null'
                });
                
                // Store in both sessionStorage and localStorage for redundancy
                sessionStorage.setItem('processedImageData', JSON.stringify(imageData));
                localStorage.setItem('processedImageData', JSON.stringify(imageData));
                
                console.log('Successfully stored processed image data in both storages');
                
                // Use paywall modal instead of custom signup modal
                if (window.paywallModal) {
                    console.log('Using paywall modal for signup');
                    window.paywallModal.show('background-remove');
                } else {
                    console.log('Paywall modal not available, using fallback');
                    // Fallback to custom modal if paywall is not available
                    this.showSignupModal();
                }
                return;
            } catch (error) {
                console.error('Error preparing image data for storage:', error);
                // Fallback to original method without data URL conversion
                const imageData = {
                    original_url: this.originalImg ? this.originalImg.src : null,
                    processed_url: this.resultImg ? this.resultImg.src : null,
                    filename: 'background-removed.png',
                    type: 'background-remove',
                    timestamp: new Date().toISOString()
                };
                
                sessionStorage.setItem('processedImageData', JSON.stringify(imageData));
                localStorage.setItem('processedImageData', JSON.stringify(imageData));
                
                if (window.paywallModal) {
                    window.paywallModal.show('background-remove');
                } else {
                    this.showSignupModal();
                }
                return;
            }
        }
        
        // User is authenticated, proceed with download
        console.log('User authenticated, proceeding with download');
        utils.downloadFile(this.resultImg.src, 'background-removed.png');
    }

    async convertBlobToDataUrl(blobUrl) {
        try {
            console.log('Converting blob URL to data URL:', blobUrl.substring(0, 50) + '...');
            
            // Fetch the blob data
            const response = await fetch(blobUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch blob: ${response.status}`);
            }
            
            const blob = await response.blob();
            console.log('Blob fetched, size:', blob.size, 'type:', blob.type);
            
            // Convert to data URL
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    console.log('Data URL created successfully');
                    resolve(reader.result);
                };
                reader.onerror = () => {
                    console.error('Error reading blob as data URL');
                    reject(new Error('Failed to convert blob to data URL'));
                };
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error converting blob to data URL:', error);
            throw error;
        }
    }

    showSignupModal() {
        // Create a simple signup modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            padding: 16px;
            box-sizing: border-box;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 16px;
                width: 100%;
                max-width: 400px;
                padding: 24px 20px;
                text-align: center;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
            ">
                <h2 style="
                    font-size: 20px;
                    font-weight: bold;
                    color: #111827;
                    margin-bottom: 8px;
                    line-height: 1.3;
                ">Get Your Background-Removed Image</h2>
                
                <p style="
                    font-size: 14px;
                    color: #6b7280;
                    margin-bottom: 20px;
                    line-height: 1.4;
                ">Sign up to download your result + 2 free credits</p>
                
                <div style="
                    background: #f3f4f6;
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 20px;
                ">
                    <div style="font-size: 13px; color: #6b7280; margin-bottom: 6px;">✓ Download your result now</div>
                    <div style="font-size: 13px; color: #6b7280; margin-bottom: 6px;">✓ 2 free credits included</div>
                    <div style="font-size: 13px; color: #6b7280; margin-bottom: 6px;">✓ No credit card required</div>
                    <div style="font-size: 13px; color: #6b7280;">✓ Cancel anytime</div>
                </div>
                
                <div id="signupForm" style="margin-bottom: 16px;">
                    <input type="text" id="signupFirstName" placeholder="First name" required style="
                        width: 100%;
                        padding: 12px 16px;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        margin-bottom: 12px;
                        font-size: 16px;
                        box-sizing: border-box;
                    ">
                    <input type="text" id="signupLastName" placeholder="Last name" required style="
                        width: 100%;
                        padding: 12px 16px;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        margin-bottom: 12px;
                        font-size: 16px;
                        box-sizing: border-box;
                    ">
                    <input type="email" id="signupEmail" placeholder="Email address" required style="
                        width: 100%;
                        padding: 12px 16px;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        margin-bottom: 12px;
                        font-size: 16px;
                        box-sizing: border-box;
                    ">
                    <input type="password" id="signupPassword" placeholder="Password" required style="
                        width: 100%;
                        padding: 12px 16px;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        margin-bottom: 16px;
                        font-size: 16px;
                        box-sizing: border-box;
                    ">
                    <button type="button" id="signupSubmitBtn" style="
                        width: 100%;
                        background: #386594;
                        color: white;
                        border: none;
                        padding: 14px 20px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        cursor: pointer;
                        box-sizing: border-box;
                    ">Sign Up Free</button>
                </div>
                
                <div style="
                    font-size: 13px;
                    color: #6b7280;
                    margin-bottom: 16px;
                ">Already have an account? <a href="#" id="loginLink" style="color: #386594; text-decoration: none;">Sign in</a></div>
                
                <div id="loginInsteadSection" style="display: none; margin-top: 16px; padding: 12px; background: #f3f4f6; border-radius: 8px; text-align: center;">
                    <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px;">Account already exists with this email</p>
                    <button id="loginInsteadBtn" style="
                        background: #E88B4B;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        font-weight: 500;
                        font-size: 14px;
                        cursor: pointer;
                    ">Login Instead</button>
                </div>
                
                <button id="closeModal" style="
                    background: none;
                    border: none;
                    color: #9ca3af;
                    font-size: 20px;
                    cursor: pointer;
                    position: absolute;
                    top: 16px;
                    right: 16px;
                ">×</button>
            </div>
        `;

        document.body.appendChild(modal);
        console.log('Modal added to DOM');
        console.log('Modal HTML length:', modal.innerHTML.length);
        console.log('Modal contains form:', modal.innerHTML.includes('signupForm'));

        // Handle signup
        const signupContainer = modal.querySelector('#signupForm');
        const firstNameInput = modal.querySelector('#signupFirstName');
        const lastNameInput = modal.querySelector('#signupLastName');
        const emailInput = modal.querySelector('#signupEmail');
        const passwordInput = modal.querySelector('#signupPassword');
        const loginLink = modal.querySelector('#loginLink');
        const closeBtn = modal.querySelector('#closeModal');
        const submitButton = modal.querySelector('#signupSubmitBtn');
        const loginInsteadSection = modal.querySelector('#loginInsteadSection');
        const loginInsteadBtn = modal.querySelector('#loginInsteadBtn');
        
        console.log('Signup elements found:', {
            container: !!signupContainer,
            firstNameInput: !!firstNameInput,
            lastNameInput: !!lastNameInput,
            emailInput: !!emailInput,
            passwordInput: !!passwordInput,
            submitButton: !!submitButton
        });

        // Simple click handler for signup
        submitButton.addEventListener('click', async (e) => {
            console.log('Signup button clicked - starting registration');
            
            const firstName = firstNameInput.value;
            const lastName = lastNameInput.value;
            const email = emailInput.value;
            const password = passwordInput.value;
            
            console.log('Form values:', { firstName, lastName, email, password: '***' });
            
            // Validate required fields
            if (!firstName || !lastName || !email || !password) {
                console.error('Missing required fields');
                utils.showNotification('Please fill in all required fields', 'error');
                return;
            }
            
            console.log('Registration attempt with email:', email);
            
            try {
                // Call registration API
                console.log('Making registration API call...');
                const requestBody = { 
                    email, 
                    password, 
                    first_name: firstName, 
                    last_name: lastName 
                };
                console.log('Request body:', requestBody);
                
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });
                
                console.log('Registration response status:', response.status);
                const data = await response.json();
                console.log('Registration response data:', data);
                
                if (response.status === 409) {
                    console.log('User already exists - showing user-friendly message');
                    utils.showNotification('An account with this email already exists. Please log in instead.', 'error');
                    
                    // Show the login instead section
                    loginInsteadSection.style.display = 'block';
                } else if (data.token && data.user) {
                    // Store token and user info
                    if (window.authUtils) {
                        window.authUtils.setAuthToken(data.token);
                        window.authUtils.setUserInfo(data.user);
                    }
                    
                    // Close modal and redirect to post-signup page
                    document.body.removeChild(modal);
                    utils.showNotification('Account created successfully! Redirecting to your download...', 'success');
                    
                    // Redirect to post-signup page
                    setTimeout(() => {
                        window.location.href = 'post-signup.html';
                    }, 1500);
                } else {
                    utils.showNotification(data.error || 'Registration failed', 'error');
                }
            } catch (error) {
                console.error('Registration error:', error);
                utils.showNotification('Registration failed. Please try again.', 'error');
            }
        });

        // Handle login link
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.removeChild(modal);
            window.location.href = 'login.html';
        });

        // Handle login instead button
        loginInsteadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.removeChild(modal);
            window.location.href = 'login.html';
        });

        // Handle close button
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
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
