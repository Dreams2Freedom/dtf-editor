// Authentication utilities for client-side use

// Universal logout function
function logout() {
    console.log('Universal logout function called');
    
    // Clear all auth data (handle all token naming conventions)
    localStorage.removeItem('authToken');
    localStorage.removeItem('userToken');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('rememberMe');
    
    // Clear any session storage
    sessionStorage.clear();
    
    // Redirect to login page
    console.log('Redirecting to login page');
    window.location.href = 'login.html';
}

// Check if user is authenticated
function isAuthenticated() {
    const token = getAuthToken();
    return !!token;
}

// Get current user data
function getCurrentUser() {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
}

// Get auth token
function getAuthToken() {
    // Standardize on authToken as primary key
    return localStorage.getItem('authToken');
}

// Verify token with server
async function verifyToken() {
    const token = getAuthToken();
    if (!token) {
        return null;
    }

    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.user;
        } else {
            // Token is invalid, clear it
            logout();
            return null;
        }
    } catch (error) {
        console.error('Token verification error:', error);
        logout();
        return null;
    }
}

// Redirect based on user type
function redirectBasedOnUserType(user) {
    if (user.is_admin) {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'dashboard.html';
    }
}

// Add logout button to any page
function addLogoutButton(containerId = 'logoutContainer') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <button 
                onclick="logout()" 
                class="text-gray-700 hover:text-primary-600 transition-colors px-3 py-2 rounded-md text-sm font-medium"
            >
                Logout
            </button>
        `;
    }
}

// Add user info to any page
function addUserInfo(containerId = 'userInfoContainer') {
    const container = document.getElementById(containerId);
    const user = getCurrentUser();
    
    if (container && user) {
        container.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="text-sm">
                    <p class="text-gray-900 font-medium">${user.first_name} ${user.last_name}</p>
                    <p class="text-gray-500">${user.email}</p>
                </div>
                ${user.is_admin ? '<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Admin</span>' : ''}
            </div>
        `;
    }
}

// Show/hide admin links based on user permissions
function updateAdminLinks() {
    const user = getCurrentUser();
    const adminLinks = document.querySelectorAll('.admin-link');
    
    adminLinks.forEach(link => {
        if (user && user.is_admin) {
            link.style.display = 'inline-block';
        } else {
            link.style.display = 'none';
        }
    });
}

// Protect page - redirect to login if not authenticated
async function protectPage() {
    const user = await verifyToken();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    return user;
}

// Protect admin page - redirect if not admin
async function protectAdminPage() {
    const user = await protectPage();
    if (user && !user.is_admin) {
        window.location.href = 'dashboard.html';
        return;
    }
    return user;
}

// Make functions globally available
window.authUtils = {
    logout,
    isAuthenticated,
    getCurrentUser,
    getAuthToken,
    verifyToken,
    redirectBasedOnUserType,
    addLogoutButton,
    addUserInfo,
    updateAdminLinks,
    protectPage,
    protectAdminPage
};

// Make logout globally available for onclick handlers
window.logout = logout;

// Ensure logout is available even if script loads after DOM
document.addEventListener('DOMContentLoaded', function() {
    window.logout = logout;
    console.log('Logout function made globally available');
});

// Also make it available immediately
if (typeof window !== 'undefined') {
    window.logout = logout;
} 