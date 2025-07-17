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

        // Logout button is handled dynamically in showDashboard()

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
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

        // Modal
        const closeUserModalBtn = document.getElementById('closeUserModal');
        if (closeUserModalBtn) {
            closeUserModalBtn.addEventListener('click', () => {
            this.closeUserModal();
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
                        id="logoutBtn"
                        class="text-gray-700 hover:text-primary-600 transition-colors px-3 py-2 rounded-md text-sm font-medium"
                    >
                        Logout
                    </button>
                </div>
            `;
            
            // Add event listener to the dynamically created logout button
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                console.log('Adding event listener to logout button');
                logoutBtn.addEventListener('click', () => {
                    console.log('Logout button clicked');
                    this.logout();
                });
            }
        }
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
                    <button data-action="view" data-user-id="${user.id}" class="text-primary-600 hover:text-primary-900 mr-3">
                        View
                    </button>
                    <button data-action="edit" data-user-id="${user.id}" class="text-indigo-600 hover:text-indigo-900 mr-3">
                        Edit
                    </button>
                    <button data-action="toggle" data-user-id="${user.id}" class="text-yellow-600 hover:text-yellow-900">
                        ${user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners to the buttons
        tbody.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const userId = parseInt(button.dataset.userId);

            switch (action) {
                case 'view':
                    this.viewUser(userId);
                    break;
                case 'edit':
                    this.editUser(userId);
                    break;
                case 'toggle':
                    this.toggleUserStatus(userId);
                    break;
            }
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
                    <button data-action="view" data-user-id="${user.id}" class="text-primary-600 hover:text-primary-900 mr-3">
                        View
                    </button>
                    <button data-action="edit" data-user-id="${user.id}" class="text-indigo-600 hover:text-indigo-900 mr-3">
                        Edit
                    </button>
                    <button data-action="toggle" data-user-id="${user.id}" class="text-yellow-600 hover:text-yellow-900">
                        ${user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            `;
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
                this.costAnalytics = data.cost_analytics;
                this.renderCosts();
            } else {
                this.showNotification('Failed to load cost analytics', 'error');
            }
        } catch (error) {
            console.error('Error loading cost analytics:', error);
            this.showNotification('Failed to load cost analytics', 'error');
        }
    }

    renderCosts() {
        if (!this.costAnalytics) return;

        // Update summary cards
        const totalCost = this.costAnalytics.costs_by_service.reduce((sum, service) => sum + parseFloat(service.total_cost || 0), 0);
        const vectorizerCost = this.costAnalytics.costs_by_service.find(s => s.service_name === 'vectorizer')?.total_cost || 0;
        const clippingMagicCost = this.costAnalytics.costs_by_service.find(s => s.service_name === 'clipping_magic')?.total_cost || 0;

        document.getElementById('totalApiCosts').textContent = `$${totalCost.toFixed(4)}`;
        document.getElementById('vectorizerCosts').textContent = `$${parseFloat(vectorizerCost).toFixed(4)}`;
        document.getElementById('clippingMagicCosts').textContent = `$${parseFloat(clippingMagicCost).toFixed(4)}`;

        // Calculate profit margin (simplified - you can enhance this with actual revenue data)
        const monthlyRevenue = this.analytics?.monthly_recurring_revenue || 0;
        const profitMargin = monthlyRevenue > 0 ? ((monthlyRevenue - totalCost) / monthlyRevenue * 100) : 0;
        document.getElementById('profitMargin').textContent = `${profitMargin.toFixed(1)}%`;

        // Render costs table
        const tbody = document.getElementById('costsTableBody');
        tbody.innerHTML = '';

        this.costAnalytics.costs_by_service.forEach(service => {
            const row = document.createElement('tr');
            const successRate = service.total_requests > 0 ? (service.successful_requests / service.total_requests * 100) : 0;
            const avgResponseTime = service.avg_response_time || 0;
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    ${service.service_name.charAt(0).toUpperCase() + service.service_name.slice(1)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    $${parseFloat(service.total_cost).toFixed(4)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${service.total_requests}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span class="px-2 py-1 text-xs rounded-full ${successRate >= 95 ? 'bg-green-100 text-green-800' : successRate >= 80 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
                        ${successRate.toFixed(1)}%
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${avgResponseTime > 0 ? `${avgResponseTime.toFixed(0)}ms` : 'N/A'}
                </td>
            `;
            tbody.appendChild(row);
        });

        // Render simple charts (you can enhance with Chart.js or similar)
        this.renderCostCharts();
    }

    renderCostCharts() {
        // Simple cost vs revenue chart
        const costRevenueChart = document.getElementById('costRevenueChart');
        if (this.costAnalytics && this.costAnalytics.revenue_data) {
            const totalRevenue = this.costAnalytics.revenue_data.reduce((sum, day) => sum + (day.credits_purchased || 0), 0);
            const totalCost = this.costAnalytics.costs_by_service.reduce((sum, service) => sum + parseFloat(service.total_cost || 0), 0);
            
            costRevenueChart.innerHTML = `
                <div class="w-full h-full flex items-center justify-center space-x-8">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-green-600">$${totalRevenue.toFixed(2)}</div>
                        <div class="text-sm text-gray-600">Total Revenue</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-red-600">$${totalCost.toFixed(4)}</div>
                        <div class="text-sm text-gray-600">Total Costs</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold ${totalRevenue > totalCost ? 'text-green-600' : 'text-red-600'}">
                            $${(totalRevenue - totalCost).toFixed(2)}
                        </div>
                        <div class="text-sm text-gray-600">Net Profit</div>
                    </div>
                </div>
            `;
        }

        // Simple daily cost trend
        const dailyCostChart = document.getElementById('dailyCostChart');
        if (this.costAnalytics && this.costAnalytics.daily_breakdown) {
            const dailyData = this.costAnalytics.daily_breakdown.slice(0, 7); // Last 7 days
            const maxCost = Math.max(...dailyData.map(d => parseFloat(d.daily_cost || 0)));
            
            dailyCostChart.innerHTML = `
                <div class="w-full h-full p-4">
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
        const modal = document.getElementById('userModal');
        const content = document.getElementById('userModalContent');

        content.innerHTML = `
            <div class="space-y-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Edit User: ${user.email}</h3>
                
                <form id="editUserForm" class="space-y-4">
                    <input type="hidden" id="editUserId" value="${user.id}">
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="editFirstName" class="block text-sm font-medium text-gray-700">First Name</label>
                            <input type="text" id="editFirstName" value="${user.first_name || ''}" 
                                   class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>
                        <div>
                            <label for="editLastName" class="block text-sm font-medium text-gray-700">Last Name</label>
                            <input type="text" id="editLastName" value="${user.last_name || ''}" 
                                   class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>
                    </div>
                    
                    <div>
                        <label for="editCompany" class="block text-sm font-medium text-gray-700">Company</label>
                        <input type="text" id="editCompany" value="${user.company || ''}" 
                               class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    </div>
                    
                    <div>
                        <label for="editCredits" class="block text-sm font-medium text-gray-700">Credits Remaining</label>
                        <input type="number" id="editCredits" value="${user.credits_remaining || 0}" min="0"
                               class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    </div>
                    
                    <div class="flex items-center">
                        <input type="checkbox" id="editIsActive" ${user.is_active ? 'checked' : ''} 
                               class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded">
                        <label for="editIsActive" class="ml-2 block text-sm text-gray-900">Active Account</label>
                    </div>
                    
                    <div class="flex justify-end space-x-3 pt-4">
                        <button type="button" id="cancelEdit" 
                                class="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" 
                                class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        `;

        modal.classList.remove('hidden');

        // Add event listeners
        const form = document.getElementById('editUserForm');
        const cancelBtn = document.getElementById('cancelEdit');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUserChanges();
        });

        cancelBtn.addEventListener('click', () => {
            this.closeUserModal();
        });
    }

    async saveUserChanges() {
        const userId = document.getElementById('editUserId').value;
        const firstName = document.getElementById('editFirstName').value;
        const lastName = document.getElementById('editLastName').value;
        const company = document.getElementById('editCompany').value;
        const credits = parseInt(document.getElementById('editCredits').value);
        const isActive = document.getElementById('editIsActive').checked;

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
                    company: company,
                    credits_remaining: credits,
                    is_active: isActive
                })
            });

            if (response.ok) {
                this.showNotification('User updated successfully', 'success');
                this.closeUserModal();
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
