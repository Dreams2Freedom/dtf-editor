// DTF Editor - Paywall Component for Logged Out Users

class PaywallModal {
    constructor() {
        console.log('PaywallModal constructor called');
        this.isVisible = false;
        this.currentAction = null; // 'vectorize' or 'background-remove'
        
        try {
            this.init();
        } catch (error) {
            console.error('Error in PaywallModal constructor:', error);
            throw error;
        }
    }

    init() {
        console.log('PaywallModal init called');
        try {
            this.createModal();
            this.setupEventListeners();
            console.log('PaywallModal initialization complete');
        } catch (error) {
            console.error('Error in PaywallModal init:', error);
            throw error;
        }
    }

    createModal() {
        try {
            console.log('Creating paywall modal...');
            // Create modal container
            const modal = document.createElement('div');
            modal.id = 'paywallModal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4';
        
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-gray-100">
                <!-- Header -->
                <div class="flex justify-between items-center p-8 border-b border-gray-100">
                    <div>
                        <h2 class="text-3xl font-bold text-primary mb-2">Unlock Professional DTF Tools</h2>
                        <p class="text-gray-600 text-lg">Sign up to access vectorization and background removal</p>
                    </div>
                    <button id="paywallCloseBtn" class="text-gray-400 hover:text-primary transition-colors p-2 rounded-lg hover:bg-gray-50">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Content -->
                <div class="p-8">
                    <!-- Feature Preview -->
                    <div class="mb-12">
                        <div class="bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl p-8 border border-gray-100">
                            <div class="flex items-center justify-center space-x-16">
                                <div class="text-center">
                                    <div class="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <svg class="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                    </div>
                                    <h3 class="font-bold text-primary text-lg mb-2">Vectorization</h3>
                                    <p class="text-gray-600">Convert images to DTF-ready vectors</p>
                                </div>
                                <div class="text-center">
                                    <div class="w-20 h-20 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <svg class="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                    </div>
                                    <h3 class="font-bold text-accent text-lg mb-2">Background Removal</h3>
                                    <p class="text-gray-600">Remove backgrounds with AI precision</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Pricing Options -->
                    <div class="grid md:grid-cols-3 gap-8 mb-12">
                        <!-- Free Plan -->
                        <div class="border-2 border-gray-200 rounded-2xl p-8 hover:border-primary/30 transition-all duration-300 hover:shadow-lg bg-white">
                            <div class="text-center">
                                <h3 class="text-2xl font-bold text-primary mb-2">Free</h3>
                                <div class="mb-4">
                                    <span class="text-4xl font-bold text-primary">$0</span>
                                    <span class="text-gray-600 text-lg">/month</span>
                                </div>
                                <p class="text-gray-600 mb-6">Perfect for getting started</p>
                            </div>
                            <ul class="space-y-4 mb-8">
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-primary mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-gray-700">2 credits per month</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-primary mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-gray-700">Basic vectorization</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-primary mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-gray-700">Background removal</span>
                                </li>
                            </ul>
                            <button id="signupFreeBtn" class="w-full bg-gray-100 text-primary border-2 border-primary py-3 px-6 rounded-xl font-semibold hover:bg-primary hover:text-white transition-all duration-300">
                                Start Free
                            </button>
                        </div>

                        <!-- Basic Plan -->
                        <div class="border-2 border-primary rounded-2xl p-8 relative bg-gradient-to-br from-primary/5 to-secondary/5 shadow-lg transform scale-105">
                            <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                <span class="bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">MOST POPULAR</span>
                            </div>
                            <div class="text-center">
                                <h3 class="text-2xl font-bold text-primary mb-2">Basic</h3>
                                <div class="mb-4">
                                    <span class="text-4xl font-bold text-primary">$9.99</span>
                                    <span class="text-gray-600 text-lg">/month</span>
                                </div>
                                <p class="text-gray-600 mb-6">For growing businesses</p>
                            </div>
                            <ul class="space-y-4 mb-8">
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-primary mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-gray-700">20 credits per month</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-primary mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-gray-700">Professional vectorization</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-primary mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-gray-700">Priority processing</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-primary mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-gray-700">Email support</span>
                                </li>
                            </ul>
                            <button id="signupBasicBtn" class="w-full bg-primary text-white py-3 px-6 rounded-xl font-semibold hover:bg-dark-blue transition-all duration-300 shadow-lg">
                                Start Basic
                            </button>
                        </div>

                        <!-- Professional Plan -->
                        <div class="border-2 border-gray-200 rounded-2xl p-8 hover:border-accent/30 transition-all duration-300 hover:shadow-lg bg-white">
                            <div class="text-center">
                                <h3 class="text-2xl font-bold text-accent mb-2">Professional</h3>
                                <div class="mb-4">
                                    <span class="text-4xl font-bold text-accent">$24.99</span>
                                    <span class="text-gray-600 text-lg">/month</span>
                                </div>
                                <p class="text-gray-600 mb-6">For power users</p>
                            </div>
                            <ul class="space-y-4 mb-8">
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-accent mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-gray-700">60 credits per month</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-accent mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-gray-700">Advanced features</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-accent mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-gray-700">Unlimited processing</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-accent mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-gray-700">Priority support</span>
                                </li>
                            </ul>
                            <button id="signupProBtn" class="w-full bg-accent text-white py-3 px-6 rounded-xl font-semibold hover:bg-accent/90 transition-all duration-300 shadow-lg">
                                Start Professional
                            </button>
                        </div>
                    </div>

                    <!-- Login Option -->
                    <div class="text-center border-t border-gray-100 pt-8">
                        <p class="text-gray-600 mb-6 text-lg">Already have an account?</p>
                        <button id="loginBtn" class="bg-gray-100 text-primary border-2 border-primary py-3 px-8 rounded-xl font-semibold hover:bg-primary hover:text-white transition-all duration-300">
                            Log In
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.modal = modal;
        console.log('Paywall modal created and appended to DOM');
        } catch (error) {
            console.error('Error creating paywall modal:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Close button
        document.getElementById('paywallCloseBtn').addEventListener('click', () => {
            this.hide();
        });

        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });

        // Signup buttons
        document.getElementById('signupFreeBtn').addEventListener('click', () => {
            this.handleSignup('free');
        });

        document.getElementById('signupBasicBtn').addEventListener('click', () => {
            this.handleSignup('basic');
        });

        document.getElementById('signupProBtn').addEventListener('click', () => {
            this.handleSignup('professional');
        });

        // Login button
        document.getElementById('loginBtn').addEventListener('click', () => {
            this.handleLogin();
        });
    }

    show(action = null) {
        console.log('Paywall show method called with action:', action);
        this.currentAction = action;
        this.isVisible = true;
        
        if (this.modal) {
            this.modal.classList.remove('hidden');
            this.modal.classList.add('flex');
            document.body.style.overflow = 'hidden';
            console.log('Paywall modal should now be visible');
        } else {
            console.error('Paywall modal element not found!');
        }
    }

    hide() {
        this.isVisible = false;
        this.modal.classList.add('hidden');
        this.modal.classList.remove('flex');
        document.body.style.overflow = '';
        this.currentAction = null;
    }

    handleSignup(plan) {
        // Store the selected plan and action in localStorage
        localStorage.setItem('selectedPlan', plan);
        if (this.currentAction) {
            localStorage.setItem('pendingAction', this.currentAction);
        }
        
        // Redirect to registration page
        window.location.href = 'register.html';
    }

    handleLogin() {
        // Store the pending action if any
        if (this.currentAction) {
            localStorage.setItem('pendingAction', this.currentAction);
        }
        
        // Redirect to login page
        window.location.href = 'login.html';
    }

    // Check if user is authenticated
    isUserAuthenticated() {
        // Check if authUtils is available
        if (!window.authUtils) {
            console.warn('authUtils not available, checking localStorage directly');
            // Fallback: check localStorage directly
            const token = localStorage.getItem('authToken');
            return !!token;
        }
        return window.authUtils.isAuthenticated();
    }

    // Show paywall if user is not authenticated
    showIfNotAuthenticated(action) {
        console.log('showIfNotAuthenticated called with action:', action);
        const isAuthenticated = this.isUserAuthenticated();
        console.log('User authenticated:', isAuthenticated);
        
        if (!isAuthenticated) {
            console.log('Showing paywall modal');
            this.show(action);
            return true; // Paywall was shown
        }
        console.log('User is authenticated, no paywall needed');
        return false; // User is authenticated, no paywall needed
    }
}

// Create global instance with error handling
try {
    console.log('Attempting to create PaywallModal instance...');
    window.paywallModal = new PaywallModal();
    console.log('PaywallModal instance created successfully');
} catch (error) {
    console.error('Error creating PaywallModal instance:', error);
    window.paywallModal = null;
}

// Ensure paywall is available after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    try {
        if (!window.paywallModal) {
            console.log('Creating PaywallModal instance after DOM load...');
            window.paywallModal = new PaywallModal();
        }
        console.log('Paywall modal initialized and available');
    } catch (error) {
        console.error('Error creating PaywallModal after DOM load:', error);
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaywallModal;
} 