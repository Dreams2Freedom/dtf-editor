// Post-Signup Page Handler
class PostSignupPage {
    constructor() {
        this.processedImageData = null;
        this.init();
        this.refreshAuthToken(); // Add token refresh
    }

    async refreshAuthToken() {
        try {
            // Check if we have a valid token
            const token = localStorage.getItem('authToken');
            if (token) {
                console.log('Checking auth token validity...');
                // Verify token is still valid
                const response = await fetch('/api/auth/verify', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    console.log('Token invalid, attempting refresh');
                    // Try to refresh the token
                    const refreshResponse = await fetch('/api/auth/refresh', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (refreshResponse.ok) {
                        const data = await refreshResponse.json();
                        localStorage.setItem('authToken', data.token);
                        console.log('Token refreshed successfully');
                    } else {
                        console.warn('Token refresh failed, user may need to login again');
                    }
                } else {
                    console.log('Token is valid');
                }
            }
        } catch (error) {
            console.error('Error refreshing auth token:', error);
        }
    }

    init() {
        this.loadProcessedImage();
        this.setupEventListeners();
    }

    async loadProcessedImage() {
        try {
            // First, check for image key in URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const imgKey = urlParams.get('imgKey');
            
            if (imgKey) {
                console.log('Found image key in URL:', imgKey);
                const storedData = localStorage.getItem(imgKey);
                if (storedData) {
                    const imageData = JSON.parse(storedData);
                    console.log('Retrieved image data from URL key:', imageData);
                    this.processedImageData = imageData;
                    this.displayImages(imageData);
                    
                    // Clean up the temporary storage
                    localStorage.removeItem(imgKey);
                    console.log('Cleaned up temporary image key storage');
                    return;
                }
            }
            
            // Fallback to direct storage check
            const imageData = this.getImageDataFromStorage();
            if (imageData) {
                console.log('Found processed image data in storage:', imageData);
                this.processedImageData = imageData;
                this.displayImages(imageData);
                
                // Clear the data after using it
                sessionStorage.removeItem('processedImageData');
                localStorage.removeItem('processedImageData');
                console.log('Cleared processed image data from storage');
            } else {
                console.log('No processed image data found in storage or URL params');
                this.showNoImageMessage();
            }
        } catch (error) {
            console.error('Error loading processed image:', error);
            this.showNoImageMessage();
        }
    }

    getImageDataFromStorage() {
        try {
            // Try sessionStorage first
            let imageData = sessionStorage.getItem('processedImageData');
            
            // If not in sessionStorage, try localStorage
            if (!imageData) {
                console.log('No data in sessionStorage, checking localStorage...');
                imageData = localStorage.getItem('processedImageData');
            }
            
            if (imageData) {
                const parsedData = JSON.parse(imageData);
                console.log('Found image data in storage:', parsedData);
                return parsedData;
            }
            
            console.log('No image data found in either sessionStorage or localStorage');
            return null;
        } catch (error) {
            console.error('Error parsing image data from storage:', error);
            return null;
        }
    }

    async loadImageFromServer(imageId) {
        try {
            const response = await fetch(`/api/images/${imageId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const imageData = await response.json();
                this.processedImageData = imageData;
                this.displayImages(imageData);
            } else {
                this.showNoImageMessage();
            }
        } catch (error) {
            console.error('Error loading image from server:', error);
            this.showNoImageMessage();
        }
    }

    displayImages(imageData) {
        const originalPreview = document.getElementById('originalPreview');
        const resultPreview = document.getElementById('resultPreview');

        if (originalPreview && imageData.original_url) {
            originalPreview.src = imageData.original_url;
            originalPreview.alt = 'Original image';
            
            // Handle image load errors
            originalPreview.onerror = () => {
                console.warn('Failed to load original image:', imageData.original_url);
                originalPreview.style.display = 'none';
            };
        }

        if (resultPreview && imageData.processed_url) {
            resultPreview.src = imageData.processed_url;
            resultPreview.alt = 'DTF-ready result';
            
            // Handle image load errors
            resultPreview.onerror = () => {
                console.warn('Failed to load processed image:', imageData.processed_url);
                resultPreview.style.display = 'none';
                // If processed image fails to load, show no image message
                this.showNoImageMessage();
            };
        }

        // Enable download button
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.addEventListener('click', () => this.downloadFile());
        }
    }

    showNoImageMessage() {
        const downloadSection = document.querySelector('.card');
        if (downloadSection) {
            downloadSection.innerHTML = `
                <div class="text-center">
                    <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <h2 class="text-2xl font-bold text-primary mb-4">No Image Found</h2>
                    <p class="text-gray-600 mb-6">
                        It looks like your processed image data isn't available. 
                        Don't worry - you can still explore our premium features!
                    </p>
                    <a href="vectorize.html" class="btn-primary">Try Vectorization</a>
                    <a href="background-remove.html" class="btn-secondary ml-4">Try Background Removal</a>
                </div>
            `;
        }
    }

    async downloadFile() {
        if (!this.processedImageData || !this.processedImageData.processed_url) {
            this.showNotification('No file available for download', 'error');
            return;
        }

        try {
            const downloadBtn = document.getElementById('downloadBtn');
            const originalText = downloadBtn.innerHTML;
            
            // Show loading state
            downloadBtn.innerHTML = `
                <svg class="w-6 h-6 mr-2 inline animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Downloading...
            `;
            downloadBtn.disabled = true;

            // Fetch the file
            const response = await fetch(this.processedImageData.processed_url);
            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.processedImageData.filename || 'dtf-ready-file.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            // Show success message
            this.showNotification('File downloaded successfully!', 'success');
            
            // Track download event
            this.trackDownload();

        } catch (error) {
            console.error('Download error:', error);
            this.showNotification('Download failed. Please try again.', 'error');
        } finally {
            // Restore button
            const downloadBtn = document.getElementById('downloadBtn');
            if (downloadBtn) {
                downloadBtn.innerHTML = `
                    <svg class="w-6 h-6 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    Download Your File
                `;
                downloadBtn.disabled = false;
            }
        }
    }

    trackDownload() {
        // Track download event for analytics
        if (window.gtag) {
            window.gtag('event', 'download', {
                'event_category': 'engagement',
                'event_label': 'post_signup_download'
            });
        }
    }

    setupEventListeners() {
        // Setup any additional event listeners here
        console.log('Post-signup page event listeners initialized');
    }

    async handleUpgrade(plan) {
        try {
            const response = await fetch('/api/user/upgrade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ plan })
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification('Upgrade successful!', 'success');
                // Redirect to dashboard or refresh page
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            } else {
                const error = await response.json();
                this.showNotification(error.message || 'Upgrade failed', 'error');
            }
        } catch (error) {
            console.error('Upgrade error:', error);
            this.showNotification('Upgrade failed. Please try again.', 'error');
        }
    }

    async processUpgrade(plan) {
        try {
            const response = await fetch('/api/user/upgrade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ plan })
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification('Upgrade successful!', 'success');
                // Redirect to dashboard or refresh page
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            } else {
                const error = await response.json();
                this.showNotification(error.message || 'Upgrade failed', 'error');
            }
        } catch (error) {
            console.error('Upgrade error:', error);
            this.showNotification('Upgrade failed. Please try again.', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;

        // Add to page
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new PostSignupPage();
});

// Global function for upgrade buttons
function upgradeToPlan(plan) {
    const page = new PostSignupPage();
    page.handleUpgrade(plan);
} 