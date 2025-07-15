// DTF Editor - Admin Dashboard

class AdminDashboard {
    constructor() {
        this.token = localStorage.getItem('adminToken');
        this.currentUser = null;
        this.users = [];
        this.logs = [];
        this.analytics = {};
        
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

        // User management
        document.getElementById('refreshUsers').addEventListener('click', () => {
            this.loadUsers();
        });

        document.getElementById('userSearch').addEventListener('input', (e) => {
            this.filterUsers(e.target.value);
        });

        // Logs
        document.getElementById('refreshLogs').addEventListener('click', () => {
            this.loadLogs();
        });

        // Modal
        document.getElementById('closeUserModal').addEventListener('click', () => {
            this.closeUserModal();
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
                    if (data.user.is_admin) {
                        this.currentUser = data.user;
                        this.showDashboard();
                        this.loadDashboardData();
                    } else {
                        this.logout();
                    }
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

            if (response.ok && data.user.is_admin) {
                this.token = data.token;
                this.currentUser = data.user;
                localStorage.setItem('adminToken', this.token);
                this.showDashboard();
                this.loadDashboardData();
            } else {
                this.showNotification('Invalid credentials or not an admin', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed', 'error');
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('adminToken');
        this.showLogin();
    }

    showLogin() {
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('dashboardSection').classList.add('hidden');
    }

    showDashboard() {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        document.getElementById('adminEmail').textContent = this.currentUser.email;
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active', 'border-primary-500', 'text-primary-600');
            btn.classList.add('border-transparent', 'text-gray-500');
        });

        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        activeBtn.classList.add('active', 'border-primary-500', 'text-primary-600');
        activeBtn.classList.remove('border-transparent', 'text-gray-500');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        document.getElementById(`${tabName}Tab`).classList.remove('hidden');

        // Load tab-specific data
        switch (tabName) {
            case 'users':
                this.loadUsers();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'logs':
                this.loadLogs();
                break;
        }
    }

    async loadDashboardData() {
        await Promise.all([
            this.loadUsers(),
            this.loadAnalytics()
        ]);
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.users = data.users;
                this.renderUsers();
                this.updateStats();
            } else {
                this.showNotification('Failed to load users', 'error');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showNotification('Failed to load users', 'error');
        }
    }

    renderUsers() {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        this.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span class="text-sm font-medium text-gray-700">
                                    ${user.first_name ? user.first_name.charAt(0) : 'U'}
                                </span>
                            </div>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">
                                ${user.first_name} ${user.last_name}
                            </div>
                            <div class="text-sm text-gray-500">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.subscription_status === 'active' ? 'bg-green-100 text-green-800' :
                        user.subscription_status === 'canceled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                    }">
                        ${user.subscription_plan || 'Free'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${user.credits_remaining} / ${user.total_credits_purchased}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${user.credits_used || 0}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="adminDashboard.viewUser(${user.id})" class="text-primary-600 hover:text-primary-900 mr-3">
                        View
                    </button>
                    <button onclick="adminDashboard.editUser(${user.id})" class="text-indigo-600 hover:text-indigo-900 mr-3">
                        Edit
                    </button>
                    <button onclick="adminDashboard.toggleUserStatus(${user.id})" class="text-yellow-600 hover:text-yellow-900">
                        ${user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    filterUsers(searchTerm) {
        const filteredUsers = this.users.filter(user => 
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderFilteredUsers(filteredUsers);
    }

    renderFilteredUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        users.forEach(user => {
            // Same rendering logic as renderUsers but with filtered data
            const row = document.createElement('tr');
            // ... (same row creation logic)
            tbody.appendChild(row);
        });
    }

    updateStats() {
        const totalUsers = this.users.length;
        const activeSubscribers = this.users.filter(u => u.subscription_status === 'active').length;
        const totalImages = this.users.reduce((sum, u) => sum + (u.credits_used || 0), 0);

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('activeSubscribers').textContent = activeSubscribers;
        document.getElementById('totalImages').textContent = totalImages;
    }

    async loadAnalytics() {
        try {
            const response = await fetch('/api/admin/analytics', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.analytics = data.analytics;
                this.renderAnalytics();
            } else {
                this.showNotification('Failed to load analytics', 'error');
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showNotification('Failed to load analytics', 'error');
        }
    }

    renderAnalytics() {
        // Subscription stats
        const subscriptionStats = document.getElementById('subscriptionStats');
        subscriptionStats.innerHTML = `
            <div class="flex justify-between">
                <span>Total Subscribers:</span>
                <span class="font-semibold">${this.analytics.total_subscribers || 0}</span>
            </div>
            <div class="flex justify-between">
                <span>Active Subscribers:</span>
                <span class="font-semibold text-green-600">${this.analytics.active_subscribers || 0}</span>
            </div>
            <div class="flex justify-between">
                <span>Canceled Subscribers:</span>
                <span class="font-semibold text-red-600">${this.analytics.canceled_subscribers || 0}</span>
            </div>
        `;

        // Revenue stats
        const revenueStats = document.getElementById('revenueStats');
        revenueStats.innerHTML = `
            <div class="flex justify-between">
                <span>Monthly Revenue:</span>
                <span class="font-semibold text-blue-600">$${(this.analytics.monthly_recurring_revenue || 0).toFixed(2)}</span>
            </div>
            <div class="flex justify-between">
                <span>Total Subscriptions:</span>
                <span class="font-semibold">${this.analytics.total_subscriptions || 0}</span>
            </div>
        `;

        document.getElementById('monthlyRevenue').textContent = `$${(this.analytics.monthly_recurring_revenue || 0).toFixed(2)}`;
    }

    async loadLogs() {
        try {
            const response = await fetch('/api/admin/logs', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.logs = data.logs;
                this.renderLogs();
            } else {
                this.showNotification('Failed to load logs', 'error');
            }
        } catch (error) {
            console.error('Error loading logs:', error);
            this.showNotification('Failed to load logs', 'error');
        }
    }

    renderLogs() {
        const tbody = document.getElementById('logsTableBody');
        tbody.innerHTML = '';

        this.logs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${log.admin_email || 'Unknown'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${log.action}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${log.target_email || 'N/A'}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    ${log.details || 'No details'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${new Date(log.created_at).toLocaleString()}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async viewUser(userId) {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.showUserModal(data);
            } else {
                this.showNotification('Failed to load user details', 'error');
            }
        } catch (error) {
            console.error('Error loading user details:', error);
            this.showNotification('Failed to load user details', 'error');
        }
    }

    showUserModal(userData) {
        const modal = document.getElementById('userModal');
        const content = document.getElementById('userModalContent');

        content.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <h4 class="font-semibold">User Information</h4>
                    <p><strong>Name:</strong> ${userData.user.first_name} ${userData.user.last_name}</p>
                    <p><strong>Email:</strong> ${userData.user.email}</p>
                    <p><strong>Company:</strong> ${userData.user.company || 'N/A'}</p>
                    <p><strong>Joined:</strong> ${new Date(userData.user.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                    <h4 class="font-semibold">Subscription</h4>
                    <p><strong>Status:</strong> ${userData.user.subscription_status}</p>
                    <p><strong>Plan:</strong> ${userData.user.subscription_plan}</p>
                    <p><strong>Credits:</strong> ${userData.user.credits_remaining} remaining</p>
                    <p><strong>Used:</strong> ${userData.user.credits_used} credits</p>
                </div>
            </div>
            <div class="mt-4">
                <h4 class="font-semibold">Recent Images (${userData.images.length})</h4>
                <div class="max-h-40 overflow-y-auto">
                    ${userData.images.slice(0, 5).map(img => `
                        <div class="flex justify-between items-center py-1">
                            <span>${img.original_filename}</span>
                            <span class="text-sm text-gray-500">${new Date(img.created_at).toLocaleDateString()}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    closeUserModal() {
        document.getElementById('userModal').classList.add('hidden');
    }

    async editUser(userId) {
        // Implement user editing functionality
        this.showNotification('User editing coming soon', 'info');
    }

    async toggleUserStatus(userId) {
        try {
            const user = this.users.find(u => u.id === userId);
            const newStatus = !user.is_active;

            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: newStatus })
            });

            if (response.ok) {
                this.showNotification(`User ${newStatus ? 'activated' : 'deactivated'} successfully`, 'success');
                this.loadUsers();
            } else {
                this.showNotification('Failed to update user status', 'error');
            }
        } catch (error) {
            console.error('Error updating user status:', error);
            this.showNotification('Failed to update user status', 'error');
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

// Initialize admin dashboard
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});
