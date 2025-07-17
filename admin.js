// DTF Editor - Admin Dashboard

class AdminDashboard {
    constructor() {
        console.log('AdminDashboard constructor called');
        this.token = localStorage.getItem('adminToken');
        this.currentUser = null;
        this.users = [];
        this.logs = [];
        this.analytics = {};
        
        this.init();
    }

    init() {
        console.log('AdminDashboard init called');
        this.setupEventListeners();
        this.checkAuth();
    }

    setupEventListeners() {
        console.log('Setting up event listeners');
        
        // Login form
        const loginForm = document.getElementById('loginForm');
        console.log('Login form element:', loginForm);
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                console.log('Login form submitted');
                e.preventDefault();
                this.login();
            });
        } else {
            console.error('Login form not found!');
        }

        // Tab switching
        document.querySelectorAll('.tab-nav-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // User management
        const refreshUsersBtn = document.getElementById('refreshUsers');
        if (refreshUsersBtn) {
            refreshUsersBtn.addEventListener('click', () => {
                this.loadUsers();
            });
        }

        const userSearchInput = document.getElementById('userSearch');
        if (userSearchInput) {
            userSearchInput.addEventListener('input', (e) => {
                this.filterUsers(e.target.value);
            });
        }

        // Logs
        const refreshLogsBtn = document.getElementById('refreshLogs');
        if (refreshLogsBtn) {
            refreshLogsBtn.addEventListener('click', () => {
                this.loadLogs();
            });
        }

        // Costs
        const refreshCostsBtn = document.getElementById('refreshCosts');
        if (refreshCostsBtn) {
            refreshCostsBtn.addEventListener('click', () => {
                this.loadCosts();
            });
        }

        const costPeriodSelect = document.getElementById('costPeriod');
        if (costPeriodSelect) {
            costPeriodSelect.addEventListener('change', () => {
                this.loadCosts();
            });
        }

        const costServiceSelect = document.getElementById('costService');
        if (costServiceSelect) {
            costServiceSelect.addEventListener('change', () => {
                this.loadCosts();
            });
        }

        // Modal close buttons
        const closeUserModalBtn = document.getElementById('closeUserModal');
        if (closeUserModalBtn) {
            closeUserModalBtn.addEventListener('click', () => {
                this.closeUserModal();
            });
        }

        const closeEditModalBtn = document.getElementById('closeEditModal');
        if (closeEditModalBtn) {
            closeEditModalBtn.addEventListener('click', () => {
                this.closeEditUserModal();
            });
        }

        const cancelEditBtn = document.getElementById('cancelEdit');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                this.closeEditUserModal();
            });
        }

        // Edit user form
        const editUserForm = document.getElementById('editUserForm');
        if (editUserForm) {
            editUserForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveUserChanges();
            });
        }
    }

    async checkAuth() {
        console.log('checkAuth called, token exists:', !!this.token);
        if (this.token) {
            try {
                console.log('Verifying token...');
                const response = await fetch('/api/auth/verify', {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                console.log('Verify response status:', response.status);
                if (response.ok) {
                    const data = await response.json();
                    console.log('Verify response data:', data);
                    if (data.user.is_admin) {
                        console.log('User is admin, showing dashboard');
                        this.currentUser = data.user;
                        this.showDashboard();
                        this.loadDashboardData();
                    } else {
                        console.log('User is not admin, logging out');
                        this.logout();
                    }
                } else {
                    console.log('Verify failed, logging out');
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

        console.log('Login attempt:', { email, password: password ? '***' : 'empty' });

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            console.log('Login response status:', response.status);
            const data = await response.json();
            console.log('Login response data:', data);

            if (response.ok && data.user.is_admin) {
                this.token = data.token;
                this.currentUser = data.user;
                localStorage.setItem('adminToken', this.token);
                this.showDashboard();
                this.loadDashboardData();
            } else {
                console.log('Login failed - not ok or not admin:', { ok: response.ok, is_admin: data.user?.is_admin });
                this.showNotification('Invalid credentials or not an admin', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed', 'error');
        }
    }

    logout() {
        console.log('logout called');
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
        console.log('showDashboard called');
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        
        // Update the auth container with user info
        const authContainer = document.getElementById('authContainer');
        console.log('Auth container found:', !!authContainer);
        if (authContainer && this.currentUser) {
            console.log('Updating auth container with user:', this.currentUser.email);
            authContainer.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="text-sm">
                        <p class="text-gray-900 font-medium">${this.currentUser.first_name} ${this.currentUser.last_name}</p>
                        <p class="text-gray-500">${this.currentUser.email}</p>
                    </div>
                    <span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Admin</span>
                    <button 
                        onclick="adminDashboard.logout()" 
                        class="btn-nav"
                    >
                        Logout
                    </button>
                </div>
            `;
        }
    }

    switchTab(tabName) {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-nav-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked tab
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Hide all tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        // Show selected tab content
        document.getElementById(`${tabName}Tab`).classList.remove('hidden');
        
        // Load data for the selected tab
        switch(tabName) {
            case 'users':
                this.loadUsers();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'costs':
                this.loadCosts();
                break;
            case 'logs':
                this.loadLogs();
                break;
        }
    }

    async loadDashboardData() {
        await Promise.all([
            this.loadUsers(),
            this.loadAnalytics(),
            this.loadCosts(),
            this.loadLogs()
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
        if (!tbody) return;

        tbody.innerHTML = this.users.map(user => `
            <tr>
                <td>
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span class="text-sm font-medium text-gray-700">
                                    ${(user.first_name || '').charAt(0)}${(user.last_name || '').charAt(0)}
                                </span>
                            </div>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">
                                ${user.first_name || ''} ${user.last_name || ''}
                            </div>
                            <div class="text-sm text-gray-500">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td class="text-sm text-gray-900">
                    ${user.subscription_plan ? user.subscription_plan.name : 'No Subscription'}
                </td>
                <td class="text-sm text-gray-900">${user.credits_remaining || 0}</td>
                <td class="text-sm text-gray-900">${user.images_count || 0}</td>
                <td>
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td class="text-sm font-medium">
                    <button onclick="adminDashboard.viewUser('${user.id}')" class="action-btn view">View</button>
                    <button onclick="adminDashboard.editUser('${user.id}')" class="action-btn edit">Edit</button>
                    <button onclick="adminDashboard.toggleUserStatus('${user.id}')" class="action-btn ${user.is_active ? 'delete' : 'view'}">
                        ${user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            </tr>
        `).join('');
    }

    filterUsers(searchTerm) {
        if (!searchTerm) {
            this.renderUsers();
            return;
        }

        const filteredUsers = this.users.filter(user => 
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.last_name && user.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        this.renderFilteredUsers(filteredUsers);
    }

    renderFilteredUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span class="text-sm font-medium text-gray-700">
                                    ${(user.first_name || '').charAt(0)}${(user.last_name || '').charAt(0)}
                                </span>
                            </div>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">
                                ${user.first_name || ''} ${user.last_name || ''}
                            </div>
                            <div class="text-sm text-gray-500">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td class="text-sm text-gray-900">
                    ${user.subscription_plan ? user.subscription_plan.name : 'No Subscription'}
                </td>
                <td class="text-sm text-gray-900">${user.credits_remaining || 0}</td>
                <td class="text-sm text-gray-900">${user.images_count || 0}</td>
                <td>
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td class="text-sm font-medium">
                    <button onclick="adminDashboard.viewUser('${user.id}')" class="action-btn view">View</button>
                    <button onclick="adminDashboard.editUser('${user.id}')" class="action-btn edit">Edit</button>
                    <button onclick="adminDashboard.toggleUserStatus('${user.id}')" class="action-btn ${user.is_active ? 'delete' : 'view'}">
                        ${user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updateStats() {
        const totalUsers = this.users.length;
        const activeSubscribers = this.users.filter(u => u.subscription_plan && u.is_active).length;
        const totalImages = this.users.reduce((sum, u) => sum + (u.images_count || 0), 0);
        const monthlyRevenue = this.users.reduce((sum, u) => {
            if (u.subscription_plan && u.is_active) {
                return sum + (u.subscription_plan.price || 0);
            }
            return sum;
        }, 0);

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('activeSubscribers').textContent = activeSubscribers;
        document.getElementById('monthlyRevenue').textContent = `$${monthlyRevenue.toFixed(2)}`;
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
                this.analytics = data;
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
        const subscriptionStats = document.getElementById('subscriptionStats');
        const revenueStats = document.getElementById('revenueStats');

        if (subscriptionStats) {
            subscriptionStats.innerHTML = `
                <div class="flex justify-between">
                    <span class="text-gray-600">Total Subscriptions:</span>
                    <span class="font-semibold">${this.analytics.total_subscriptions || 0}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Active Subscriptions:</span>
                    <span class="font-semibold">${this.analytics.active_subscriptions || 0}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Free Users:</span>
                    <span class="font-semibold">${this.analytics.free_users || 0}</span>
                </div>
            `;
        }

        if (revenueStats) {
            revenueStats.innerHTML = `
                <div class="flex justify-between">
                    <span class="text-gray-600">Monthly Revenue:</span>
                    <span class="font-semibold">$${(this.analytics.monthly_revenue || 0).toFixed(2)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Total Revenue:</span>
                    <span class="font-semibold">$${(this.analytics.total_revenue || 0).toFixed(2)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Avg. Revenue/User:</span>
                    <span class="font-semibold">$${(this.analytics.avg_revenue_per_user || 0).toFixed(2)}</span>
                </div>
            `;
        }
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
        if (!tbody) return;

        tbody.innerHTML = this.logs.map(log => `
            <tr>
                <td class="text-sm text-gray-900">${new Date(log.created_at).toLocaleString()}</td>
                <td>
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        log.level === 'error' ? 'bg-red-100 text-red-800' :
                        log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                    }">
                        ${log.level}
                    </span>
                </td>
                <td class="text-sm text-gray-900">${log.action}</td>
                <td class="text-sm text-gray-900">${log.user_email || 'System'}</td>
                <td class="text-sm text-gray-900">${log.details}</td>
            </tr>
        `).join('');
    }

    async loadCosts() {
        try {
            const period = document.getElementById('costPeriod')?.value || '30d';
            const service = document.getElementById('costService')?.value || '';

            const response = await fetch(`/api/admin/cost-analytics?period=${period}&service=${service}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderCosts(data.cost_analytics);
            } else {
                this.showNotification('Failed to load cost data', 'error');
            }
        } catch (error) {
            console.error('Error loading costs:', error);
            this.showNotification('Failed to load cost data', 'error');
        }
    }

    renderCosts(costAnalytics) {
        if (!costAnalytics) return;

        // Calculate totals from the costs_by_service data
        const totalCost = costAnalytics.costs_by_service.reduce((sum, service) => sum + parseFloat(service.total_cost || 0), 0);
        const vectorizerCost = costAnalytics.costs_by_service.find(s => s.service_name === 'vectorizer')?.total_cost || 0;
        const clippingMagicCost = costAnalytics.costs_by_service.find(s => s.service_name === 'clipping_magic')?.total_cost || 0;

        // Update cost summary cards
        document.getElementById('totalApiCosts').textContent = `$${totalCost.toFixed(2)}`;
        document.getElementById('vectorizerCosts').textContent = `$${parseFloat(vectorizerCost).toFixed(2)}`;
        document.getElementById('clippingMagicCosts').textContent = `$${parseFloat(clippingMagicCost).toFixed(2)}`;
        
        // Calculate profit margin (simplified - you can enhance this with actual revenue data)
        const monthlyRevenue = this.analytics?.monthly_revenue || 0;
        const profitMargin = monthlyRevenue > 0 ? ((monthlyRevenue - totalCost) / monthlyRevenue * 100) : 0;
        document.getElementById('profitMargin').textContent = `${profitMargin.toFixed(1)}%`;

        // Render charts
        this.renderCostCharts(costAnalytics);
    }

    renderCostCharts(costAnalytics) {
        // Simple chart placeholders - you can replace with actual chart library
        const costRevenueChart = document.getElementById('costRevenueChart');
        const dailyCostChart = document.getElementById('dailyCostChart');

        if (costRevenueChart) {
            const totalCost = costAnalytics.costs_by_service.reduce((sum, service) => sum + parseFloat(service.total_cost || 0), 0);
            const monthlyRevenue = this.analytics?.monthly_revenue || 0;
            
            costRevenueChart.innerHTML = `
                <div class="h-full flex items-center justify-center">
                    <div class="text-center">
                        <h4 class="font-semibold text-gray-900 mb-2">Cost vs Revenue</h4>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span>Revenue:</span>
                                <span class="font-semibold text-green-600">$${monthlyRevenue.toFixed(2)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Costs:</span>
                                <span class="font-semibold text-red-600">$${totalCost.toFixed(2)}</span>
                            </div>
                            <div class="flex justify-between border-t pt-2">
                                <span>Profit:</span>
                                <span class="font-semibold text-blue-600">$${(monthlyRevenue - totalCost).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (dailyCostChart) {
            const dailyData = costAnalytics.daily_breakdown.slice(0, 7); // Last 7 days
            const maxCost = Math.max(...dailyData.map(d => parseFloat(d.daily_cost || 0)));
            
            dailyCostChart.innerHTML = `
                <div class="h-full flex items-center justify-center">
                    <div class="text-center">
                        <h4 class="font-semibold text-gray-900 mb-2">Daily Cost Trends</h4>
                        <div class="flex items-end justify-between h-full space-x-2">
                            ${dailyData.map(day => {
                                const height = maxCost > 0 ? (parseFloat(day.daily_cost || 0) / maxCost * 100) : 0;
                                return `
                                    <div class="flex-1 flex flex-col items-center">
                                        <div class="bg-blue-500 rounded-t w-full" style="height: ${height}%"></div>
                                        <div class="text-xs text-gray-600 mt-2">$${parseFloat(day.daily_cost || 0).toFixed(3)}</div>
                                        <div class="text-xs text-gray-500">${new Date(day.date).toLocaleDateString()}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
        }
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
                this.showUserModal(data.user);
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
            <div class="space-y-6">
                <div class="flex items-center space-x-4">
                    <div class="flex-shrink-0 h-16 w-16">
                        <div class="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                            <span class="text-lg font-medium text-gray-700">
                                ${(userData.first_name || '').charAt(0)}${(userData.last_name || '').charAt(0)}
                            </span>
                        </div>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900">
                            ${userData.first_name || ''} ${userData.last_name || ''}
                        </h3>
                        <p class="text-gray-600">${userData.email}</p>
                        <p class="text-sm text-gray-500">${userData.company || 'No company'}</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-semibold text-gray-900">Account Status</h4>
                        <p class="text-sm text-gray-600">
                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                userData.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }">
                                ${userData.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-900">Credits Remaining</h4>
                        <p class="text-sm text-gray-600">${userData.credits_remaining || 0}</p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-900">Subscription</h4>
                        <p class="text-sm text-gray-600">
                            ${userData.subscription_plan ? userData.subscription_plan.name : 'No Subscription'}
                        </p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-900">Images Generated</h4>
                        <p class="text-sm text-gray-600">${userData.images_count || 0}</p>
                    </div>
                </div>

                <div class="space-y-3">
                    <h4 class="font-semibold text-gray-900">Recent Images (${userData.images.length})</h4>
                    <div class="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                        ${userData.images.slice(0, 5).map(img => `
                            <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                                <span class="text-sm">${img.original_filename}</span>
                                <span class="text-xs text-gray-500">${new Date(img.created_at).toLocaleDateString()}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    closeUserModal() {
        document.getElementById('userModal').classList.add('hidden');
    }

    closeEditUserModal() {
        document.getElementById('editUserModal').classList.add('hidden');
    }

    async editUser(userId) {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.showEditUserModal(data.user);
            } else {
                this.showNotification('Failed to load user details for editing', 'error');
            }
        } catch (error) {
            console.error('Error loading user details for editing:', error);
            this.showNotification('Failed to load user details for editing', 'error');
        }
    }

    showEditUserModal(user) {
        // Populate the edit form fields
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editFirstName').value = user.first_name || '';
        document.getElementById('editLastName').value = user.last_name || '';
        document.getElementById('editEmail').value = user.email || '';
        document.getElementById('editCompany').value = user.company || '';
        document.getElementById('editCredits').value = user.credits_remaining || 0;
        document.getElementById('editStatus').value = user.is_active ? 'active' : 'suspended';

        // Show the modal
        document.getElementById('editUserModal').classList.remove('hidden');
    }

    async saveUserChanges() {
        const userId = document.getElementById('editUserId')?.value;
        const firstName = document.getElementById('editFirstName').value;
        const lastName = document.getElementById('editLastName').value;
        const email = document.getElementById('editEmail').value;
        const company = document.getElementById('editCompany').value;
        const credits = parseInt(document.getElementById('editCredits').value);
        const status = document.getElementById('editStatus').value;

        if (!userId) {
            this.showNotification('User ID not found', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    company: company,
                    credits_remaining: credits,
                    is_active: status === 'active'
                })
            });

            if (response.ok) {
                this.showNotification('User updated successfully', 'success');
                this.closeEditUserModal();
                this.loadUsers(); // Refresh the users list
            } else {
                const errorData = await response.json();
                this.showNotification(`Failed to update user: ${errorData.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            this.showNotification('Failed to update user', 'error');
        }
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
