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
        this.guestPreviewEndpoint = '/api/preview-guest';
        
        this.init();
    }

    init() {
        console.log('VectorizeApp init called');
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        // Flag to prevent multiple simultaneous processing
        this.isProcessing = false;

        this.fileInput.addEventListener('change', (e) => {
            console.log('File input change event triggered');
            const file = e.target.files[0];
            if (file && !this.isProcessing) {
                this.isProcessing = true;
                // Allow processing without authentication - value-first approach
                this.handleVectorization(file);
            }
        });

        this.uploadArea.addEventListener('click', () => {
            // Prevent duplicate triggers
            if (this.isProcessing) {
                console.log('Already processing, ignoring click');
                return;
            }
            
            // Allow file dialog without authentication - value-first approach
            this.fileInput.click();
        });

        this.downloadBtn.addEventListener('click', async () => {
            await this.downloadVector();
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
                // Allow processing without authentication - value-first approach
                this.handleVectorization(files[0]);
            }
        }, false);
    }

    async handleVectorization(file) {
        try {
            console.log('handleVectorization called with file:', file);
            
            // Value-first approach: Allow processing without authentication
            // Authentication will be required only for download
            
            // Validate file
            if (!utils.validateFile(file)) {
                this.isProcessing = false; // Reset processing flag
                return;
            }

            // Show original image preview
            this.showOriginalPreview(file);

            // Show progress
            this.showProgress();

            try {
                // Start progress simulation
                const progressInterval = utils.simulateProgress(this.progressBar, this.progressText);
                
                // Generate preview with retry mechanism
                const previewData = await utils.retryWithBackoff(async () => {
                    return await this.generatePreview(file);
                }, 3, 2000); // 3 retries, 2 second base delay
                
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
                        this.isProcessing = false; // Reset processing flag
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
        this.progressText.textContent = 'Vectorizing...';
    }

    updateProgress(percentage) {
        this.progressBar.style.width = `${percentage}%`;
        this.progressText.textContent = `Vectorizing... ${Math.round(percentage)}%`;
    }

    async generatePreview(file) {
        try {
            console.log('Starting preview generation for file:', file.name, 'Size:', file.size);
            
            // Check if user is authenticated
            const isAuthenticated = window.authUtils && window.authUtils.isAuthenticated();
            const token = isAuthenticated ? window.authUtils.getAuthToken() : null;
            
            // Create FormData for the preview endpoint
            const formData = new FormData();
            formData.append('image', file);
            
            // Use different endpoints for authenticated vs guest users
            const endpoint = isAuthenticated ? this.previewEndpoint : this.guestPreviewEndpoint;
            console.log('Preview API endpoint:', endpoint);
            
            // Make API call to preview endpoint
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: formData
            });
            
            console.log('Preview API response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Preview API error response:', errorText);
                
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: errorText };
                }
                
                if (response.status === 401) {
                    // For non-authenticated users, this shouldn't happen with our new approach
                    throw new Error('Authentication required. Please log in to use this feature.');
                } else if (response.status === 402) {
                    throw new Error(`Insufficient credits. You have ${errorData.credits_remaining} credits remaining.`);
                } else if (response.status === 429 || errorData.errorCode === 'RATE_LIMITED') {
                    const retryAfter = errorData.retryAfter || '5 minutes';
                    throw new Error(`Service temporarily unavailable due to high demand. Please try again in ${retryAfter}.`);
                } else if (response.status === 503 || errorData.errorCode === 'SERVICE_UNAVAILABLE') {
                    throw new Error('Service temporarily unavailable. Please try again later.');
                } else {
                    // Use the user-friendly error message from the server if available
                    const errorMessage = errorData.error || `Preview API call failed: ${response.status} - ${response.statusText}`;
                    throw new Error(errorMessage);
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
        
        // Update download button text for guest users
        const isGuest = previewData.isGuest || (!window.authUtils || !window.authUtils.isAuthenticated());
        if (isGuest && this.downloadBtn) {
            this.downloadBtn.textContent = 'Sign Up to Download';
            this.downloadBtn.style.background = '#E88B4B';
        } else if (this.downloadBtn) {
            this.downloadBtn.textContent = 'Download SVG';
            this.downloadBtn.style.background = '#386594';
        }
        
        // Scroll to results
        this.result.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        console.log('Preview results displayed successfully');

        // ---------- NEW GUEST CTA OVERLAY ----------
        if (!window.authUtils || !window.authUtils.isAuthenticated()) {
            if (!this.result.querySelector('.guest-cta-overlay')) {
                const overlay=document.createElement('div');
                overlay.className='guest-cta-overlay';
                overlay.style.cssText=`position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;border-radius:8px;gap:16px;text-align:center;padding:24px;`;
                overlay.innerHTML=`<p style="font-size:18px;font-weight:600;margin:0 0 8px;">Sign up to download full-resolution file</p><button id="guestVectorSignupBtn" style="background:#E88B4B;border:none;padding:12px 24px;border-radius:6px;font-size:16px;font-weight:600;cursor:pointer;">Sign Up Free</button>`;
                this.result.style.position='relative';
                this.result.appendChild(overlay);
                overlay.querySelector('#guestVectorSignupBtn').addEventListener('click',()=>{
                    if(window.paywallModal){window.paywallModal.show('vectorize');}else{window.location.href='register.html';}
                });
            }
        }
        // --------------------------------------------

        // NEW: auto-store image data for guest users so paywall signup works if they hit Sign-Up before Download
        if (!window.authUtils || !window.authUtils.isAuthenticated()) {
            try {
                const imageData = {
                    original_url: previewData.originalUrl || null,
                    processed_url: previewData.previewUrl,
                    filename: 'vectorized-image.svg',
                    type: 'vectorize',
                    timestamp: new Date().toISOString()
                };
                sessionStorage.setItem('processedImageData', JSON.stringify(imageData));
                localStorage.setItem('processedImageData', JSON.stringify(imageData));
                console.log('Auto-stored processed image data for guest user (showPreviewResults)');
            } catch (e) {
                console.error('Failed auto-store processed image data', e);
            }
        }
    }

    showError(message) {
        // Hide progress
        this.progress.classList.add('hidden');
        
        // Show error message
        utils.showNotification(message, 'error');
    }

    async downloadVector() {
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
                    filename: 'vectorized-image.svg',
                    type: 'vectorize',
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
                    window.paywallModal.show('vectorize');
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
                    filename: 'vectorized-image.svg',
                    type: 'vectorize',
                    timestamp: new Date().toISOString()
                };
                
                sessionStorage.setItem('processedImageData', JSON.stringify(imageData));
                localStorage.setItem('processedImageData', JSON.stringify(imageData));
                
                if (window.paywallModal) {
                    window.paywallModal.show('vectorize');
                } else {
                    this.showSignupModal();
                }
                return;
            }
        }
        
        // User is authenticated, proceed with download
        console.log('User authenticated, proceeding with download');
        utils.downloadFile(this.resultImg.src, 'vectorized-image.svg');
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
                ">Get Your Vectorized Image</h2>
                
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
                    <button type="submit" style="
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
                </form>
                
                <div style="
                    font-size: 13px;
                    color: #6b7280;
                    margin-bottom: 16px;
                ">Already have an account? <a href="#" id="loginLink" style="color: #386594; text-decoration: none;">Sign in</a></div>
                
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

        // Handle form submission
        const form = modal.querySelector('#signupForm');
        const firstNameInput = modal.querySelector('#signupFirstName');
        const lastNameInput = modal.querySelector('#signupLastName');
        const emailInput = modal.querySelector('#signupEmail');
        const passwordInput = modal.querySelector('#signupPassword');
        const loginLink = modal.querySelector('#loginLink');
        const closeBtn = modal.querySelector('#closeModal');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const firstName = firstNameInput.value;
            const lastName = lastNameInput.value;
            const email = emailInput.value;
            const password = passwordInput.value;
            
            try {
                // Call registration API
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        email, 
                        password, 
                        first_name: firstName, 
                        last_name: lastName 
                    })
                });
                
                const data = await response.json();
                
                if (data.token && data.user) {
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
