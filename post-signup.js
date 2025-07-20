// Post-Signup Page Handler
class PostSignupPage {
    constructor() {
        this.processedImageData = null;
        this.init();
    }

    init() {
        this.loadProcessedImage();
        this.setupEventListeners();
    }

    async loadProcessedImage() {
        try {
            // Get the processed image data from sessionStorage or URL params
            const imageData = this.getImageDataFromStorage();
            
            if (imageData) {
                console.log('Found processed image data in sessionStorage:', imageData);
                this.processedImageData = imageData;
                this.displayImages(imageData);
            } else {
                // Fallback: try to get from URL parameters
                const urlParams = new URLSearchParams(window.location.search);
                const imageId = urlParams.get('imageId');
                
                if (imageId) {
                    await this.loadImageFromServer(imageId);
                } else {
                    console.log('No processed image data found in sessionStorage or URL params');
                    this.showNoImageMessage();
                }
            }
        } catch (error) {
            console.error('Error loading processed image:', error);
            this.showNoImageMessage();
        }
    }

    getImageDataFromStorage() {
        try {
            const imageData = sessionStorage.getItem('processedImageData');
            return imageData ? JSON.parse(imageData) : null;
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
        // Setup upgrade plan buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="upgradeToPlan"]')) {
                e.preventDefault();
                const plan = e.target.getAttribute('onclick').match(/upgradeToPlan\('(.+?)'\)/)[1];
                this.handleUpgrade(plan);
            }
        });
    }

    async handleUpgrade(plan) {
        try {
            // Check if user is logged in
            const user = await authUtils.verifyToken();
            
            if (!user) {
                // Redirect to login with upgrade intent
                window.location.href = `login.html?upgrade=${plan}`;
                return;
            }

            // User is logged in, proceed with upgrade
            await this.processUpgrade(plan);

        } catch (error) {
            console.error('Upgrade error:', error);
            this.showNotification('Upgrade failed. Please try again.', 'error');
        }
    }

    async processUpgrade(plan) {
        try {
            const response = await fetch('/api/subscriptions/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    plan: plan,
                    source: 'post_signup'
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.requires_payment) {
                    // Redirect to Stripe checkout
                    window.location.href = data.checkout_url;
                } else {
                    // Free trial or immediate activation
                    this.showNotification('Plan upgraded successfully!', 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 2000);
                }
            } else {
                const error = await response.json();
                this.showNotification(error.message || 'Upgrade failed', 'error');
            }

        } catch (error) {
            console.error('Upgrade processing error:', error);
            this.showNotification('Upgrade failed. Please try again.', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="flex items-center">
                <span>${message}</span>
                <button class="ml-auto text-white opacity-70 hover:opacity-100" onclick="this.parentElement.parentElement.remove()">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Global function for upgrade buttons
function upgradeToPlan(plan) {
    if (window.postSignupPage) {
        window.postSignupPage.handleUpgrade(plan);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.postSignupPage = new PostSignupPage();
}); 