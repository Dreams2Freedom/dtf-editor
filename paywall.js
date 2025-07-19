// DTF Editor - Paywall Component for Logged Out Users

class PaywallModal {
    constructor() {
        this.isVisible = false;
        this.currentAction = null; // 'vectorize' or 'background-remove'
        this.init();
    }

    init() {
        this.createModal();
        this.setupEventListeners();
    }

    createModal() {
        // Create modal container
        const modal = document.createElement('div');
        modal.id = 'paywallModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4';
        
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <!-- Header -->
                <div class="flex justify-between items-center p-6 border-b border-gray-200">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-900">Unlock Professional DTF Tools</h2>
                        <p class="text-gray-600 mt-1">Sign up to access vectorization and background removal</p>
                    </div>
                    <button id="paywallCloseBtn" class="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Content -->
                <div class="p-6">
                    <!-- Feature Preview -->
                    <div class="mb-8">
                        <div class="bg-gradient-to-r from-blue-50 to-orange-50 rounded-lg p-6">
                            <div class="flex items-center justify-center space-x-8">
                                <div class="text-center">
                                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                    </div>
                                    <h3 class="font-semibold text-gray-900">Vectorization</h3>
                                    <p class="text-sm text-gray-600">Convert images to DTF-ready vectors</p>
                                </div>
                                <div class="text-center">
                                    <div class="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <svg class="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                    </div>
                                    <h3 class="font-semibold text-gray-900">Background Removal</h3>
                                    <p class="text-sm text-gray-600">Remove backgrounds with AI precision</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Pricing Options -->
                    <div class="grid md:grid-cols-3 gap-6 mb-8">
                        <!-- Free Plan -->
                        <div class="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                            <div class="text-center">
                                <h3 class="text-xl font-bold text-gray-900">Free</h3>
                                <div class="mt-2">
                                    <span class="text-3xl font-bold text-gray-900">$0</span>
                                    <span class="text-gray-600">/month</span>
                                </div>
                                <p class="text-sm text-gray-600 mt-2">Perfect for getting started</p>
                            </div>
                            <ul class="mt-6 space-y-3">
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">2 credits per month</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">Basic vectorization</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">Background removal</span>
                                </li>
                            </ul>
                            <button id="signupFreeBtn" class="w-full mt-6 bg-gray-100 text-gray-900 py-2 px-4 rounded-md font-medium hover:bg-gray-200 transition-colors">
                                Start Free
                            </button>
                        </div>

                        <!-- Basic Plan -->
                        <div class="border-2 border-blue-500 rounded-lg p-6 relative bg-blue-50">
                            <div class="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                <span class="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">MOST POPULAR</span>
                            </div>
                            <div class="text-center">
                                <h3 class="text-xl font-bold text-gray-900">Basic</h3>
                                <div class="mt-2">
                                    <span class="text-3xl font-bold text-gray-900">$9.99</span>
                                    <span class="text-gray-600">/month</span>
                                </div>
                                <p class="text-sm text-gray-600 mt-2">For growing businesses</p>
                            </div>
                            <ul class="mt-6 space-y-3">
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">20 credits per month</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">Professional vectorization</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">Priority processing</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">Email support</span>
                                </li>
                            </ul>
                            <button id="signupBasicBtn" class="w-full mt-6 bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors">
                                Start Basic
                            </button>
                        </div>

                        <!-- Professional Plan -->
                        <div class="border-2 border-gray-200 rounded-lg p-6 hover:border-orange-300 transition-colors">
                            <div class="text-center">
                                <h3 class="text-xl font-bold text-gray-900">Professional</h3>
                                <div class="mt-2">
                                    <span class="text-3xl font-bold text-gray-900">$24.99</span>
                                    <span class="text-gray-600">/month</span>
                                </div>
                                <p class="text-sm text-gray-600 mt-2">For power users</p>
                            </div>
                            <ul class="mt-6 space-y-3">
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">60 credits per month</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">Advanced features</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">Unlimited processing</span>
                                </li>
                                <li class="flex items-center">
                                    <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">Priority support</span>
                                </li>
                            </ul>
                            <button id="signupProBtn" class="w-full mt-6 bg-orange-600 text-white py-2 px-4 rounded-md font-medium hover:bg-orange-700 transition-colors">
                                Start Professional
                            </button>
                        </div>
                    </div>

                    <!-- Login Option -->
                    <div class="text-center border-t border-gray-200 pt-6">
                        <p class="text-gray-600 mb-4">Already have an account?</p>
                        <button id="loginBtn" class="bg-gray-100 text-gray-900 py-2 px-6 rounded-md font-medium hover:bg-gray-200 transition-colors">
                            Log In
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.modal = modal;
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
        this.currentAction = action;
        this.isVisible = true;
        this.modal.classList.remove('hidden');
        this.modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
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
        return window.authUtils && window.authUtils.isAuthenticated();
    }

    // Show paywall if user is not authenticated
    showIfNotAuthenticated(action) {
        if (!this.isUserAuthenticated()) {
            this.show(action);
            return true; // Paywall was shown
        }
        return false; // User is authenticated, no paywall needed
    }
}

// Create global instance
window.paywallModal = new PaywallModal();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaywallModal;
} 