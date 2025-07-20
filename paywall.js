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
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4 md:p-6 lg:p-8';
        
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-[85%] max-w-md mx-auto max-h-[85vh] overflow-y-auto border-0 md:max-w-4xl lg:max-w-5xl">
                <!-- Header with Close Button -->
                <div class="relative p-6 md:p-8 border-b border-gray-100">
                    <button id="paywallCloseBtn" class="absolute top-4 right-4 md:top-6 md:right-6 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-50">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                    
                    <div class="text-center max-w-2xl mx-auto">
                        <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">Unlock Professional DTF Tools</h2>
                        <p class="text-base md:text-lg text-gray-600 mb-2">Transform your images with AI-powered vectorization and background removal</p>
                        <div class="flex items-center justify-center space-x-6 text-sm text-gray-500">
                            <div class="flex items-center">
                                <svg class="w-4 h-4 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                Vectorization
                            </div>
                            <div class="flex items-center">
                                <svg class="w-4 h-4 text-accent mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                Background Removal
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Pricing Plans -->
                <div class="p-6 md:p-8">
                    <!-- Mobile Slider (hidden on desktop) -->
                    <div class="md:hidden">
                        <div class="relative overflow-hidden">
                            <!-- Slider Container -->
                            <div id="planSlider" class="flex transition-transform duration-300 ease-in-out" style="width: 300%;">
                                <!-- Free Plan -->
                                <div class="w-1/3 flex-shrink-0 px-2">
                                    <div class="bg-white border border-gray-200 rounded-xl p-6 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
                                        <div class="text-center mb-6">
                                            <h3 class="text-xl font-bold text-gray-900 mb-2">Free</h3>
                                            <div class="mb-3">
                                                <span class="text-3xl font-bold text-gray-900">$0</span>
                                                <span class="text-gray-600">/month</span>
                                            </div>
                                            <p class="text-sm text-gray-600">Perfect for getting started</p>
                                        </div>
                                        
                                        <ul class="space-y-3 mb-8">
                                            <li class="flex items-start">
                                                <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                                </svg>
                                                <span class="text-sm text-gray-700">2 credits per month</span>
                                            </li>
                                            <li class="flex items-start">
                                                <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                                </svg>
                                                <span class="text-sm text-gray-700">Basic vectorization</span>
                                            </li>
                                            <li class="flex items-start">
                                                <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                                </svg>
                                                <span class="text-sm text-gray-700">Background removal</span>
                                            </li>
                                        </ul>
                                        
                                        <button id="signupFreeBtn" class="w-full bg-white text-primary border-2 border-primary py-3 px-6 rounded-lg font-semibold hover:bg-primary hover:text-white transition-all duration-300 text-sm">
                                            Start Free
                                        </button>
                                    </div>
                                </div>

                                <!-- Basic Plan - Featured -->
                                <div class="w-1/3 flex-shrink-0 px-2">
                                    <div class="relative bg-gradient-to-br from-primary to-secondary border-2 border-primary rounded-xl p-6 shadow-xl">
                                        <div class="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                            <span class="bg-accent text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">MOST POPULAR</span>
                                        </div>
                                        
                                        <div class="text-center mb-6">
                                            <h3 class="text-xl font-bold text-white mb-2">Basic</h3>
                                            <div class="mb-3">
                                                <span class="text-3xl font-bold text-white">$9.99</span>
                                                <span class="text-white/80">/month</span>
                                            </div>
                                            <p class="text-sm text-white/80">For growing businesses</p>
                                        </div>
                                        
                                        <ul class="space-y-3 mb-8">
                                            <li class="flex items-start">
                                                <svg class="w-5 h-5 text-white mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                                </svg>
                                                <span class="text-sm text-white">20 credits per month</span>
                                            </li>
                                            <li class="flex items-start">
                                                <svg class="w-5 h-5 text-white mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                                </svg>
                                                <span class="text-sm text-white">Professional vectorization</span>
                                            </li>
                                            <li class="flex items-start">
                                                <svg class="w-5 h-5 text-white mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                                </svg>
                                                <span class="text-sm text-white">Priority processing</span>
                                            </li>
                                            <li class="flex items-start">
                                                <svg class="w-5 h-5 text-white mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                                </svg>
                                                <span class="text-sm text-white">Email support</span>
                                            </li>
                                        </ul>
                                        
                                        <button id="signupBasicBtn" class="w-full bg-white text-primary py-3 px-6 rounded-lg font-bold hover:bg-gray-50 transition-all duration-300 text-sm shadow-lg">
                                            Start Basic
                                        </button>
                                    </div>
                                </div>

                                <!-- Professional Plan -->
                                <div class="w-1/3 flex-shrink-0 px-2">
                                    <div class="bg-white border border-gray-200 rounded-xl p-6 hover:border-accent/30 transition-all duration-300 hover:shadow-lg">
                                        <div class="text-center mb-6">
                                            <h3 class="text-xl font-bold text-gray-900 mb-2">Professional</h3>
                                            <div class="mb-3">
                                                <span class="text-3xl font-bold text-accent">$24.99</span>
                                                <span class="text-gray-600">/month</span>
                                            </div>
                                            <p class="text-sm text-gray-600">For power users</p>
                                        </div>
                                        
                                        <ul class="space-y-3 mb-8">
                                            <li class="flex items-start">
                                                <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                                </svg>
                                                <span class="text-sm text-gray-700">60 credits per month</span>
                                            </li>
                                            <li class="flex items-start">
                                                <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                                </svg>
                                                <span class="text-sm text-gray-700">Advanced features</span>
                                            </li>
                                            <li class="flex items-start">
                                                <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                                </svg>
                                                <span class="text-sm text-gray-700">Unlimited processing</span>
                                            </li>
                                            <li class="flex items-start">
                                                <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                                </svg>
                                                <span class="text-sm text-gray-700">Priority support</span>
                                            </li>
                                        </ul>
                                        
                                        <button id="signupProBtn" class="w-full bg-accent text-white py-3 px-6 rounded-lg font-semibold hover:bg-accent/90 transition-all duration-300 text-sm shadow-lg">
                                            Start Professional
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Navigation Arrows -->
                            <button id="prevPlan" class="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-primary p-2 rounded-full shadow-lg border border-gray-200 transition-all duration-300">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                </svg>
                            </button>
                            <button id="nextPlan" class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-primary p-2 rounded-full shadow-lg border border-gray-200 transition-all duration-300">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </button>
                        </div>

                        <!-- Pagination Dots -->
                        <div class="flex justify-center mt-6 space-x-2">
                            <button class="planDot w-3 h-3 rounded-full bg-primary transition-all duration-300" data-plan="0"></button>
                            <button class="planDot w-3 h-3 rounded-full bg-gray-300 transition-all duration-300" data-plan="1"></button>
                            <button class="planDot w-3 h-3 rounded-full bg-gray-300 transition-all duration-300" data-plan="2"></button>
                        </div>
                    </div>

                    <!-- Desktop Grid (hidden on mobile) -->
                    <div class="hidden md:grid md:grid-cols-3 gap-6 md:gap-8">
                        <!-- Free Plan -->
                        <div class="relative bg-white border border-gray-200 rounded-xl p-6 md:p-8 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center mb-6">
                                <h3 class="text-xl font-bold text-gray-900 mb-2">Free</h3>
                                <div class="mb-3">
                                    <span class="text-3xl font-bold text-gray-900">$0</span>
                                    <span class="text-gray-600">/month</span>
                                </div>
                                <p class="text-sm text-gray-600">Perfect for getting started</p>
                            </div>
                            
                            <ul class="space-y-3 mb-8">
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">2 credits per month</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">Basic vectorization</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">Background removal</span>
                                </li>
                            </ul>
                            
                            <button id="signupFreeBtnDesktop" class="w-full bg-white text-primary border-2 border-primary py-3 px-6 rounded-lg font-semibold hover:bg-primary hover:text-white transition-all duration-300 text-sm">
                                Start Free
                            </button>
                        </div>

                        <!-- Basic Plan - Featured -->
                        <div class="relative bg-gradient-to-br from-primary to-secondary border-2 border-primary rounded-xl p-6 md:p-8 transform scale-105 shadow-xl">
                            <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                <span class="bg-accent text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg">MOST POPULAR</span>
                            </div>
                            
                            <div class="text-center mb-6">
                                <h3 class="text-xl font-bold text-white mb-2">Basic</h3>
                                <div class="mb-3">
                                    <span class="text-3xl font-bold text-white">$9.99</span>
                                    <span class="text-white/80">/month</span>
                                </div>
                                <p class="text-sm text-white/80">For growing businesses</p>
                            </div>
                            
                            <ul class="space-y-3 mb-8">
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-white mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-white">20 credits per month</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-white mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-white">Professional vectorization</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-white mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-white">Priority processing</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-white mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-white">Email support</span>
                                </li>
                            </ul>
                            
                            <button id="signupBasicBtnDesktop" class="w-full bg-white text-primary py-3 px-6 rounded-lg font-bold hover:bg-gray-50 transition-all duration-300 text-sm shadow-lg">
                                Start Basic
                            </button>
                        </div>

                        <!-- Professional Plan -->
                        <div class="relative bg-white border border-gray-200 rounded-xl p-6 md:p-8 hover:border-accent/30 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center mb-6">
                                <h3 class="text-xl font-bold text-gray-900 mb-2">Professional</h3>
                                <div class="mb-3">
                                    <span class="text-3xl font-bold text-accent">$24.99</span>
                                    <span class="text-gray-600">/month</span>
                                </div>
                                <p class="text-sm text-gray-600">For power users</p>
                            </div>
                            
                            <ul class="space-y-3 mb-8">
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">60 credits per month</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">Advanced features</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">Unlimited processing</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="text-sm text-gray-700">Priority support</span>
                                </li>
                            </ul>
                            
                            <button id="signupProBtnDesktop" class="w-full bg-accent text-white py-3 px-6 rounded-lg font-semibold hover:bg-accent/90 transition-all duration-300 text-sm shadow-lg">
                                Start Professional
                            </button>
                        </div>
                    </div>

                    <!-- Login Option -->
                    <div class="text-center mt-8 pt-6 border-t border-gray-100">
                        <p class="text-sm text-gray-600 mb-4">Already have an account?</p>
                        <button id="loginBtn" class="text-primary font-semibold hover:text-primary/80 transition-colors text-sm">
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

        // Mobile slider functionality
        this.setupMobileSlider();

        // Signup buttons (mobile)
        document.getElementById('signupFreeBtn').addEventListener('click', () => {
            this.handleSignup('free');
        });

        document.getElementById('signupBasicBtn').addEventListener('click', () => {
            this.handleSignup('basic');
        });

        document.getElementById('signupProBtn').addEventListener('click', () => {
            this.handleSignup('professional');
        });

        // Signup buttons (desktop)
        document.getElementById('signupFreeBtnDesktop').addEventListener('click', () => {
            this.handleSignup('free');
        });

        document.getElementById('signupBasicBtnDesktop').addEventListener('click', () => {
            this.handleSignup('basic');
        });

        document.getElementById('signupProBtnDesktop').addEventListener('click', () => {
            this.handleSignup('professional');
        });

        // Login button
        document.getElementById('loginBtn').addEventListener('click', () => {
            this.handleLogin();
        });
    }

    setupMobileSlider() {
        const slider = document.getElementById('planSlider');
        const prevBtn = document.getElementById('prevPlan');
        const nextBtn = document.getElementById('nextPlan');
        const dots = document.querySelectorAll('.planDot');
        
        let currentPlan = 0;
        const totalPlans = 3;

        const updateSlider = () => {
            const translateX = -(currentPlan * 33.333);
            slider.style.transform = `translateX(${translateX}%)`;
            
            // Update dots
            dots.forEach((dot, index) => {
                if (index === currentPlan) {
                    dot.classList.remove('bg-gray-300');
                    dot.classList.add('bg-primary');
                } else {
                    dot.classList.remove('bg-primary');
                    dot.classList.add('bg-gray-300');
                }
            });

            // Update arrow visibility
            prevBtn.style.opacity = currentPlan === 0 ? '0.5' : '1';
            nextBtn.style.opacity = currentPlan === totalPlans - 1 ? '0.5' : '1';
        };

        // Navigation buttons
        prevBtn.addEventListener('click', () => {
            if (currentPlan > 0) {
                currentPlan--;
                updateSlider();
            }
        });

        nextBtn.addEventListener('click', () => {
            if (currentPlan < totalPlans - 1) {
                currentPlan++;
                updateSlider();
            }
        });

        // Dot navigation
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                currentPlan = index;
                updateSlider();
            });
        });

        // Touch/swipe support
        let startX = 0;
        let endX = 0;

        slider.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        });

        slider.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            const threshold = 50;

            if (Math.abs(diff) > threshold) {
                if (diff > 0 && currentPlan < totalPlans - 1) {
                    // Swipe left - next plan
                    currentPlan++;
                } else if (diff < 0 && currentPlan > 0) {
                    // Swipe right - previous plan
                    currentPlan--;
                }
                updateSlider();
            }
        });

        // Initialize slider
        updateSlider();
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