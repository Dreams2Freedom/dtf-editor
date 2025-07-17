// DTF Editor - User Dashboard

class UserDashboard {
    constructor() {
        this.token = localStorage.getItem('userToken');
        this.currentUser = null;
        this.images = [];
        this.usageHistory = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Register form
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        // Form switching
        document.getElementById('showRegister').addEventListener('click', () => {
            this.showRegisterForm();
        });

        document.getElementById('showLogin').addEventListener('click', () => {
            this.showLoginForm();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Profile form
        document.getElementById('profileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
        });

        // Password form
        document.getElementById('passwordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });

        // Images refresh
        document.getElementById('refreshImages').addEventListener('click', () => {
            this.loadImages();
        });
    }

    async checkAuth() {
        if (this.token) {
            try {
                const response = await fetch('/api/auth/verify', {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.currentUser = data.user;
                    this.showDashboard();
                    this.loadDashboardData();
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Auth check error:', error);
                this.logout();
            }
        }
    }

    async login() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.currentUser = data.user;
                localStorage.setItem('userToken', this.token);
                this.showDashboard();
                this.loadDashboardData();
            } else {
                this.showNotification(data.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed', 'error');
        }
    }

    async register() {
        const formData = {
            email: document.getElementById('regEmail').value,
            password: document.getElementById('regPassword').value,
            first_name: document.getElementById('regFirstName').value,
            last_name: document.getElementById('regLastName').value,
            company: document.getElementById('regCompany').value
        };

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Account created successfully! Please log in.', 'success');
                this.showLoginForm();
            } else {
                this.showNotification(data.message || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification('Registration failed', 'error');
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('userToken');
        this.showLogin();
    }

    showLoginForm() {
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('registerSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.add('hidden');
    }

    showRegisterForm() {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('registerSection').classList.remove('hidden');
        document.getElementById('dashboardSection').classList.add('hidden');
    }

    showDashboard() {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('registerSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        
        this.updateUserInfo();
        this.updateNavigation();
    }

    updateNavigation() {
        const authContainer = document.getElementById('authContainer');
        
        if (this.currentUser) {
            // User is logged in
            authContainer.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="text-sm">
                        <p class="text-gray-900 font-medium">${this.currentUser.first_name} ${this.currentUser.last_name}</p>
                        <p class="text-gray-500">${this.currentUser.email}</p>
                    </div>
                    ${this.currentUser.is_admin ? '<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Admin</span>' : ''}
                    <button 
                        onclick="userDashboard.logout()" 
                        class="text-gray-700 hover:text-[#386594] transition-colors px-3 py-2 rounded-md text-sm font-medium"
                    >
                        Logout
                    </button>
                </div>
            `;
        } else {
            // User is not logged in
            authContainer.innerHTML = `
                <a href="login.html" class="text-gray-700 hover:text-[#386594] transition-colors px-3 py-2 rounded-md text-sm font-medium">
                    Login
                </a>
            `;
        }
    }

    updateUserInfo() {
        document.getElementById('userName').textContent = this.currentUser.first_name || 'User';
        
        // Update profile form
        document.getElementById('profileFirstName').value = this.currentUser.first_name || '';
        document.getElementById('profileLastName').value = this.currentUser.last_name || '';
        document.getElementById('profileEmail').value = this.currentUser.email || '';
        document.getElementById('profileCompany').value = this.currentUser.company || '';
    }

    switchTab(tabName) {
        console.log('Switching to tab:', tabName);
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active', 'border-[#E88B4B]', 'text-[#E88B4B]');
            btn.classList.add('border-transparent', 'text-gray-500');
        });

        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active', 'border-[#E88B4B]', 'text-[#E88B4B]');
            activeBtn.classList.remove('border-transparent', 'text-gray-500');
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        const tabContent = document.getElementById(`${tabName}Tab`);
        if (tabContent) {
            tabContent.classList.remove('hidden');
            console.log(`Tab content ${tabName}Tab is now visible`);
        } else {
            console.error(`Tab content ${tabName}Tab not found`);
        }

        // Load tab-specific data
        switch (tabName) {
            case 'images':
                console.log('Loading images...');
                this.loadImages();
                break;
            case 'subscription':
                this.loadSubscriptionInfo();
                break;
            case 'usage':
                this.loadUsageHistory();
                break;
        }
    }

    async loadDashboardData() {
        await Promise.all([
            this.loadUserStats(),
            this.loadImages(),
            this.loadSubscriptionInfo(),
            this.loadUsageHistory()
        ]);
    }

    async loadUserStats() {
        try {
            const response = await fetch('/api/user/profile', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateStats(data.user);
            }
        } catch (error) {
            console.error('Error loading user stats:', error);
        }
    }

    updateStats(user) {
        document.getElementById('creditsRemaining').textContent = user.credits_remaining || 0;
        document.getElementById('creditsUsed').textContent = user.credits_used || 0;
        document.getElementById('imagesGenerated').textContent = user.credits_used || 0;
        document.getElementById('subscriptionStatus').textContent = user.subscription_status || 'Free';
    }

    async loadImages() {
        console.log('Loading images...');
        try {
            const response = await fetch('/api/user/images', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            console.log('Images response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Images data:', data);
                this.images = data.images || [];
                this.renderImages();
            } else {
                console.error('Failed to load images, status:', response.status);
                this.showNotification('Failed to load images', 'error');
            }
        } catch (error) {
            console.error('Error loading images:', error);
            this.showNotification('Failed to load images', 'error');
        }
    }

    renderImages() {
        const grid = document.getElementById('imagesGrid');
        grid.innerHTML = '';

        if (this.images.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="bg-white rounded-lg shadow-lg p-8">
                        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path>
                        </svg>
                        <h3 class="text-lg font-semibold text-[#386594] mb-2">No Images Yet</h3>
                        <p class="text-gray-500 mb-4">You haven't generated any images yet. Start by vectorizing an image or removing a background.</p>
                        <div class="flex flex-col sm:flex-row gap-3 justify-center">
                            <a href="vectorize.html" class="btn-primary px-6 py-2 rounded-md text-center">
                                Start Vectorizing
                            </a>
                            <a href="background-remove.html" class="btn-secondary px-6 py-2 rounded-md text-center">
                                Remove Background
                            </a>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        this.images.forEach(image => {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg shadow-md overflow-hidden';
            
            // Determine image type and display appropriate content
            const isSvg = image.processed_filename.toLowerCase().endsWith('.svg');
            const imageType = image.image_type || 'processed';
            const toolUsed = image.tool_used || 'unknown';
            
            card.innerHTML = `
                <div class="aspect-w-16 aspect-h-9 bg-gray-200 flex items-center justify-center">
                    ${isSvg ? 
                        `<div class="text-center p-4">
                            <svg class="w-16 h-16 mx-auto text-gray-400 mb-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path>
                            </svg>
                            <p class="text-sm text-gray-500">SVG Vector Image</p>
                        </div>` :
                        `<img src="/api/user/images/${image.id}/download" alt="${image.original_filename}" class="w-full h-48 object-cover">`
                    }
                </div>
                <div class="p-4">
                    <h4 class="font-semibold text-gray-900 mb-2 truncate">${image.original_filename}</h4>
                    <p class="text-sm text-gray-600 mb-1">Type: ${imageType}</p>
                    <p class="text-sm text-gray-600 mb-1">Tool: ${toolUsed}</p>
                    <p class="text-xs text-gray-500">${new Date(image.created_at).toLocaleDateString()}</p>
                    <div class="mt-3 flex space-x-2">
                        <button onclick="userDashboard.downloadImage(${image.id})" class="btn-primary px-3 py-1 rounded text-sm">
                            Download
                        </button>
                        <button onclick="userDashboard.deleteImage(${image.id})" class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors">
                            Delete
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    async downloadImage(imageId) {
        try {
            // Find the image to get the filename
            const image = this.images.find(img => img.id === imageId);
            if (!image) {
                this.showNotification('Image not found', 'error');
                return;
            }

            const response = await fetch(`/api/user/images/${imageId}/download`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = image.processed_filename || `processed_image_${imageId}.png`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                this.showNotification('Download started', 'success');
            } else {
                this.showNotification('Failed to download image', 'error');
            }
        } catch (error) {
            console.error('Error downloading image:', error);
            this.showNotification('Failed to download image', 'error');
        }
    }

    async deleteImage(imageId) {
        if (!confirm('Are you sure you want to delete this image?')) {
            return;
        }

        try {
            const response = await fetch(`/api/user/images/${imageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.showNotification('Image deleted successfully', 'success');
                this.loadImages();
            } else {
                this.showNotification('Failed to delete image', 'error');
            }
        } catch (error) {
            console.error('Error deleting image:', error);
            this.showNotification('Failed to delete image', 'error');
        }
    }

    async loadSubscriptionInfo() {
        try {
            const response = await fetch('/api/user/subscription', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderSubscriptionInfo(data);
            } else {
                this.showNotification('Failed to load subscription info', 'error');
            }
        } catch (error) {
            console.error('Error loading subscription info:', error);
            this.showNotification('Failed to load subscription info', 'error');
        }
    }

    renderSubscriptionInfo(data) {
        const infoDiv = document.getElementById('subscriptionInfo');
        infoDiv.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <h4 class="font-semibold text-gray-900">Current Plan</h4>
                    <p class="text-lg">${data.subscription?.plan_name || 'Free'}</p>
                </div>
                <div>
                    <h4 class="font-semibold text-gray-900">Status</h4>
                    <p class="text-lg ${data.subscription?.status === 'active' ? 'text-green-600' : 'text-red-600'}">
                        ${data.subscription?.status || 'Inactive'}
                    </p>
                </div>
                <div>
                    <h4 class="font-semibold text-gray-900">Next Billing</h4>
                    <p class="text-lg">${data.subscription?.next_billing_date ? new Date(data.subscription.next_billing_date).toLocaleDateString() : 'N/A'}</p>
                </div>
            </div>
        `;

        // Render subscription plans
        const plansDiv = document.getElementById('subscriptionPlans');
        plansDiv.innerHTML = `
            <div class="bg-white border rounded-lg p-6">
                <h4 class="text-lg font-semibold text-gray-900 mb-4">Free Plan</h4>
                <p class="text-3xl font-bold text-gray-900 mb-4">$0<span class="text-lg text-gray-500">/month</span></p>
                <ul class="space-y-2 mb-6">
                    <li class="flex items-center">
                        <span class="text-green-500 mr-2">✓</span>
                        5 credits per month
                    </li>
                    <li class="flex items-center">
                        <span class="text-green-500 mr-2">✓</span>
                        Basic vectorization
                    </li>
                </ul>
                <button class="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md cursor-not-allowed">
                    Current Plan
                </button>
            </div>
            <div class="bg-white border-2 border-primary-500 rounded-lg p-6 relative">
                <div class="absolute top-0 right-0 bg-primary-500 text-white px-3 py-1 rounded-bl-lg text-sm">
                    Popular
                </div>
                <h4 class="text-lg font-semibold text-gray-900 mb-4">Pro Plan</h4>
                <p class="text-3xl font-bold text-gray-900 mb-4">$29<span class="text-lg text-gray-500">/month</span></p>
                <ul class="space-y-2 mb-6">
                    <li class="flex items-center">
                        <span class="text-green-500 mr-2">✓</span>
                        100 credits per month
                    </li>
                    <li class="flex items-center">
                        <span class="text-green-500 mr-2">✓</span>
                        Advanced vectorization
                    </li>
                    <li class="flex items-center">
                        <span class="text-green-500 mr-2">✓</span>
                        Background removal
                    </li>
                    <li class="flex items-center">
                        <span class="text-green-500 mr-2">✓</span>
                        Priority support
                    </li>
                </ul>
                <button onclick="userDashboard.subscribe('pro')" class="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors">
                    Upgrade to Pro
                </button>
            </div>
            <div class="bg-white border rounded-lg p-6">
                <h4 class="text-lg font-semibold text-gray-900 mb-4">Enterprise Plan</h4>
                <p class="text-3xl font-bold text-gray-900 mb-4">$99<span class="text-lg text-gray-500">/month</span></p>
                <ul class="space-y-2 mb-6">
                    <li class="flex items-center">
                        <span class="text-green-500 mr-2">✓</span>
                        Unlimited credits
                    </li>
                    <li class="flex items-center">
                        <span class="text-green-500 mr-2">✓</span>
                        All features
                    </li>
                    <li class="flex items-center">
                        <span class="text-green-500 mr-2">✓</span>
                        API access
                    </li>
                    <li class="flex items-center">
                        <span class="text-green-500 mr-2">✓</span>
                        Dedicated support
                    </li>
                </ul>
                <button onclick="userDashboard.subscribe('enterprise')" class="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors">
                    Contact Sales
                </button>
            </div>
        `;
    }

    async subscribe(plan) {
        try {
            const response = await fetch('/api/user/subscription/create', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ plan })
            });

            const data = await response.json();

            if (response.ok) {
                // Redirect to Stripe checkout
                window.location.href = data.checkout_url;
            } else {
                this.showNotification(data.message || 'Failed to create subscription', 'error');
            }
        } catch (error) {
            console.error('Error creating subscription:', error);
            this.showNotification('Failed to create subscription', 'error');
        }
    }

    async loadUsageHistory() {
        try {
            const response = await fetch('/api/user/usage', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.usageHistory = data.usage;
                this.renderUsageHistory();
            } else {
                this.showNotification('Failed to load usage history', 'error');
            }
        } catch (error) {
            console.error('Error loading usage history:', error);
            this.showNotification('Failed to load usage history', 'error');
        }
    }

    renderUsageHistory() {
        const tbody = document.getElementById('usageTableBody');
        tbody.innerHTML = '';

        if (this.usageHistory.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                        No usage history found.
                    </td>
                </tr>
            `;
            return;
        }

        this.usageHistory.forEach(usage => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${new Date(usage.created_at).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${usage.type}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${usage.credits_used}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    ${usage.description}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async updateProfile() {
        const formData = {
            first_name: document.getElementById('profileFirstName').value,
            last_name: document.getElementById('profileLastName').value,
            company: document.getElementById('profileCompany').value
        };

        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = { ...this.currentUser, ...formData };
                this.showNotification('Profile updated successfully', 'success');
            } else {
                this.showNotification(data.message || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showNotification('Failed to update profile', 'error');
        }
    }

    async changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;

        try {
            const response = await fetch('/api/user/password', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Password changed successfully', 'success');
                document.getElementById('passwordForm').reset();
            } else {
                this.showNotification(data.message || 'Failed to change password', 'error');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            this.showNotification('Failed to change password', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
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
}

// Initialize user dashboard
let userDashboard;
document.addEventListener('DOMContentLoaded', () => {
    userDashboard = new UserDashboard();
});
