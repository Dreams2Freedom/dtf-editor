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
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 9999;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 16px;
            `;
        
        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 16px;
                width: 90%;
                max-width: 500px;
                margin: 0 auto;
                max-height: 95vh;
                overflow-y: auto;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                border: none;
            ">
                <!-- Header with Close Button -->
                <div style="
                    position: relative;
                    padding: 24px;
                    border-bottom: 1px solid #f3f4f6;
                ">
                    <button id="paywallCloseBtn" style="
                        position: absolute;
                        top: 16px;
                        right: 16px;
                        color: #9ca3af;
                        background: none;
                        border: none;
                        padding: 8px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 20px;
                    ">×</button>
                    
                    <div style="text-align: center; max-width: 500px; margin: 0 auto;">
                        <h2 style="
                            font-size: 28px;
                            font-weight: bold;
                            color: #111827;
                            margin-bottom: 8px;
                        ">Choose Your Plan</h2>
                        <p style="
                            font-size: 16px;
                            color: #6b7280;
                            margin-bottom: 0;
                        ">Start creating professional DTF transfers today</p>
                    </div>
                </div>

                <!-- Pricing Plans -->
                <div style="padding: 16px;">
                    <!-- Mobile Slider (hidden on desktop) -->
                    <div id="mobileSlider" style="display: block;">
                        <div style="position: relative; overflow: hidden; padding: 0 8px;">
                            <!-- Slider Container -->
                            <div id="planSlider" style="
                                display: flex;
                                transition: transform 0.3s ease-in-out;
                                width: 300%;
                            ">
                                <!-- Free Plan -->
                                <div style="width: 100%; flex-shrink: 0; padding: 0;">
                                    <div style="
                                        background: white;
                                        border: 1px solid #e5e7eb;
                                        border-radius: 16px;
                                        padding: 24px 20px;
                                        transition: all 0.3s;
                                        text-align: center;
                                    ">
                                        <h3 style="
                                            font-size: 24px;
                                            font-weight: bold;
                                            color: #111827;
                                            margin-bottom: 8px;
                                        ">Free</h3>
                                        <div style="margin-bottom: 16px;">
                                            <span style="
                                                font-size: 36px;
                                                font-weight: bold;
                                                color: #111827;
                                            ">$0</span>
                                            <span style="color: #6b7280; font-size: 16px;">/month</span>
                                        </div>
                                        <p style="
                                            font-size: 14px;
                                            color: #6b7280;
                                            margin-bottom: 20px;
                                        ">Perfect for getting started</p>
                                        
                                        <div style="margin-bottom: 24px;">
                                            <div style="
                                                background: #f3f4f6;
                                                border-radius: 8px;
                                                padding: 16px;
                                                margin-bottom: 12px;
                                            ">
                                                <div style="font-size: 18px; font-weight: bold; color: #111827; margin-bottom: 4px;">2 Credits</div>
                                                <div style="font-size: 12px; color: #6b7280;">per month</div>
                                            </div>
                                            <div style="font-size: 14px; color: #6b7280;">
                                                ✓ Vectorization & Background Removal
                                            </div>
                                        </div>
                                        
                                        <button id="signupFreeBtn" style="
                                            width: 100%;
                                            background: white;
                                            color: #386594;
                                            border: 2px solid #386594;
                                            padding: 14px 20px;
                                            border-radius: 12px;
                                            font-weight: 600;
                                            transition: all 0.3s;
                                            font-size: 16px;
                                            cursor: pointer;
                                        ">Start Free</button>
                                    </div>
                                </div>

                                <!-- Basic Plan - Featured -->
                                <div style="width: 100%; flex-shrink: 0; padding: 0;">
                                    <div style="
                                        position: relative;
                                        background: linear-gradient(135deg, #386594, #457BB9);
                                        border: 2px solid #386594;
                                        border-radius: 16px;
                                        padding: 24px 20px;
                                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                                        text-align: center;
                                    ">
                                        <div style="
                                            position: absolute;
                                            top: -12px;
                                            left: 50%;
                                            transform: translateX(-50%);
                                        ">
                                            <span style="
                                                background-color: #E88B4B;
                                                color: white;
                                                padding: 6px 16px;
                                                border-radius: 9999px;
                                                font-size: 12px;
                                                font-weight: bold;
                                                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                                            ">MOST POPULAR</span>
                                        </div>
                                        
                                        <h3 style="
                                            font-size: 24px;
                                            font-weight: bold;
                                            color: white;
                                            margin-bottom: 8px;
                                            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                                        ">Basic</h3>
                                        <div style="margin-bottom: 16px;">
                                            <span style="
                                                font-size: 36px;
                                                font-weight: bold;
                                                color: white;
                                                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                                            ">$9.99</span>
                                            <span style="
                                                color: white;
                                                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                                                font-size: 16px;
                                            ">/month</span>
                                        </div>
                                        <p style="
                                            font-size: 14px;
                                            color: white;
                                            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                                            margin-bottom: 20px;
                                        ">For growing businesses</p>
                                        
                                        <div style="margin-bottom: 24px;">
                                            <div style="
                                                background: rgba(255, 255, 255, 0.2);
                                                border-radius: 8px;
                                                padding: 16px;
                                                margin-bottom: 12px;
                                            ">
                                                <div style="font-size: 18px; font-weight: bold; color: white; margin-bottom: 4px;">20 Credits</div>
                                                <div style="font-size: 12px; color: rgba(255, 255, 255, 0.8);">per month</div>
                                            </div>
                                            <div style="font-size: 14px; color: rgba(255, 255, 255, 0.9);">
                                                ✓ Priority Processing & Email Support
                                            </div>
                                        </div>
                                        
                                        <button id="signupBasicBtn" style="
                                            width: 100%;
                                            background: white;
                                            color: #386594;
                                            border: none;
                                            padding: 14px 20px;
                                            border-radius: 12px;
                                            font-weight: bold;
                                            transition: all 0.3s;
                                            font-size: 16px;
                                            cursor: pointer;
                                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                                        ">Start Basic</button>
                                    </div>
                                </div>

                                <!-- Professional Plan -->
                                <div style="width: 100%; flex-shrink: 0; padding: 0;">
                                    <div style="
                                        background: white;
                                        border: 1px solid #e5e7eb;
                                        border-radius: 16px;
                                        padding: 24px 20px;
                                        transition: all 0.3s;
                                        text-align: center;
                                    ">
                                        <h3 style="
                                            font-size: 24px;
                                            font-weight: bold;
                                            color: #111827;
                                            margin-bottom: 8px;
                                        ">Professional</h3>
                                        <div style="margin-bottom: 16px;">
                                            <span style="
                                                font-size: 36px;
                                                font-weight: bold;
                                                color: #E88B4B;
                                            ">$24.99</span>
                                            <span style="color: #6b7280; font-size: 16px;">/month</span>
                                        </div>
                                        <p style="
                                            font-size: 14px;
                                            color: #6b7280;
                                            margin-bottom: 20px;
                                        ">For power users</p>
                                        
                                        <div style="margin-bottom: 24px;">
                                            <div style="
                                                background: #fef3c7;
                                                border-radius: 8px;
                                                padding: 16px;
                                                margin-bottom: 12px;
                                            ">
                                                <div style="font-size: 18px; font-weight: bold; color: #92400e; margin-bottom: 4px;">60 Credits</div>
                                                <div style="font-size: 12px; color: #92400e;">per month</div>
                                            </div>
                                            <div style="font-size: 14px; color: #6b7280;">
                                                ✓ Unlimited Processing & Priority Support
                                            </div>
                                        </div>
                                        
                                        <button id="signupProBtn" style="
                                            width: 100%;
                                            background-color: #E88B4B;
                                            color: white;
                                            border: none;
                                            padding: 14px 20px;
                                            border-radius: 12px;
                                            font-weight: 600;
                                            transition: all 0.3s;
                                            font-size: 16px;
                                            cursor: pointer;
                                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                                        ">Start Professional</button>
                                    </div>
                                </div>
                            </div>

                            <!-- Navigation Arrows -->
                            <button id="prevPlan" style="
                                position: absolute;
                                left: 8px;
                                top: 50%;
                                transform: translateY(-50%);
                                background: rgba(255, 255, 255, 0.9);
                                color: #6b7280;
                                padding: 8px;
                                border-radius: 50%;
                                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                                border: 1px solid #e5e7eb;
                                transition: all 0.3s;
                                cursor: pointer;
                                width: 40px;
                                height: 40px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">‹</button>
                            <button id="nextPlan" style="
                                position: absolute;
                                right: 8px;
                                top: 50%;
                                transform: translateY(-50%);
                                background: rgba(255, 255, 255, 0.9);
                                color: #6b7280;
                                padding: 8px;
                                border-radius: 50%;
                                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                                border: 1px solid #e5e7eb;
                                transition: all 0.3s;
                                cursor: pointer;
                                width: 40px;
                                height: 40px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">›</button>
                        </div>

                        <!-- Pagination Dots -->
                        <div style="
                            display: flex;
                            justify-content: center;
                            margin-top: 24px;
                            gap: 8px;
                        ">
                            <button class="planDot" data-plan="0" style="
                                width: 12px;
                                height: 12px;
                                border-radius: 50%;
                                transition: all 0.3s;
                                background-color: #386594;
                                border: none;
                                cursor: pointer;
                            "></button>
                            <button class="planDot" data-plan="1" style="
                                width: 12px;
                                height: 12px;
                                border-radius: 50%;
                                transition: all 0.3s;
                                background-color: #d1d5db;
                                border: none;
                                cursor: pointer;
                            "></button>
                            <button class="planDot" data-plan="2" style="
                                width: 12px;
                                height: 12px;
                                border-radius: 50%;
                                transition: all 0.3s;
                                background-color: #d1d5db;
                                border: none;
                                cursor: pointer;
                            "></button>
                        </div>
                    </div>

                    <!-- Desktop Grid (hidden on mobile) -->
                    <div id="desktopGrid" style="display: none;">
                        <div style="
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 24px;
                        ">
                        <!-- Free Plan -->
                            <div style="
                                position: relative;
                                background: white;
                                border: 1px solid #e5e7eb;
                                border-radius: 12px;
                                padding: 24px;
                                transition: all 0.3s;
                            ">
                                <div style="text-align: center; margin-bottom: 24px;">
                                    <h3 style="
                                        font-size: 20px;
                                        font-weight: bold;
                                        color: #111827;
                                        margin-bottom: 8px;
                                    ">Free</h3>
                                    <div style="margin-bottom: 12px;">
                                        <span style="
                                            font-size: 32px;
                                            font-weight: bold;
                                            color: #111827;
                                        ">$0</span>
                                        <span style="color: #6b7280;">/month</span>
                                    </div>
                                    <p style="
                                        font-size: 14px;
                                        color: #6b7280;
                                    ">Perfect for getting started</p>
                                </div>
                                
                                <ul style="
                                    list-style: none;
                                    padding: 0;
                                    margin: 0 0 32px 0;
                                ">
                                    <li style="
                                        display: flex;
                                        align-items: start;
                                        margin-bottom: 12px;
                                    ">
                                        <span style="
                                            color: #059669;
                                            margin-right: 12px;
                                            margin-top: 2px;
                                        ">✓</span>
                                        <span style="
                                            font-size: 14px;
                                            color: #374151;
                                        ">2 credits per month</span>
                                </li>
                                    <li style="
                                        display: flex;
                                        align-items: start;
                                        margin-bottom: 12px;
                                    ">
                                        <span style="
                                            color: #059669;
                                            margin-right: 12px;
                                            margin-top: 2px;
                                        ">✓</span>
                                        <span style="
                                            font-size: 14px;
                                            color: #374151;
                                        ">Basic vectorization</span>
                                </li>
                                    <li style="
                                        display: flex;
                                        align-items: start;
                                        margin-bottom: 12px;
                                    ">
                                        <span style="
                                            color: #059669;
                                            margin-right: 12px;
                                            margin-top: 2px;
                                        ">✓</span>
                                        <span style="
                                            font-size: 14px;
                                            color: #374151;
                                        ">Background removal</span>
                                </li>
                            </ul>
                                
                                <button id="signupFreeBtnDesktop" style="
                                    width: 100%;
                                    background: white;
                                    color: #386594;
                                    border: 2px solid #386594;
                                    padding: 12px 24px;
                                    border-radius: 8px;
                                    font-weight: 600;
                                    transition: all 0.3s;
                                    font-size: 14px;
                                    cursor: pointer;
                                ">Start Free</button>
                            </div>

                            <!-- Basic Plan - Featured -->
                            <div style="
                                position: relative;
                                background: linear-gradient(135deg, #386594, #457BB9);
                                border: 2px solid #386594;
                                border-radius: 12px;
                                padding: 24px;
                                transform: scale(1.05);
                                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                            ">
                                <div style="
                                    position: absolute;
                                    top: -16px;
                                    left: 50%;
                                    transform: translateX(-50%);
                                ">
                                    <span style="
                                        background-color: #E88B4B;
                                        color: white;
                                        padding: 8px 16px;
                                        border-radius: 9999px;
                                        font-size: 12px;
                                        font-weight: bold;
                                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                                    ">MOST POPULAR</span>
                                </div>
                                
                                <div style="text-align: center; margin-bottom: 24px;">
                                    <h3 style="
                                        font-size: 20px;
                                        font-weight: bold;
                                        color: white;
                                        margin-bottom: 8px;
                                        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                                    ">Basic</h3>
                                    <div style="margin-bottom: 12px;">
                                        <span style="
                                            font-size: 32px;
                                            font-weight: bold;
                                            color: white;
                                            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                                        ">$9.99</span>
                                        <span style="
                                            color: white;
                                            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                                        ">/month</span>
                                    </div>
                                    <p style="
                                        font-size: 14px;
                                        color: white;
                                        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                                    ">For growing businesses</p>
                            </div>
                                
                                <ul style="
                                    list-style: none;
                                    padding: 0;
                                    margin: 0 0 32px 0;
                                ">
                                    <li style="
                                        display: flex;
                                        align-items: start;
                                        margin-bottom: 12px;
                                    ">
                                        <span style="
                                            color: white;
                                            margin-right: 12px;
                                            margin-top: 2px;
                                        ">✓</span>
                                        <span style="
                                            font-size: 14px;
                                            color: white;
                                        ">20 credits per month</span>
                                </li>
                                    <li style="
                                        display: flex;
                                        align-items: start;
                                        margin-bottom: 12px;
                                    ">
                                        <span style="
                                            color: white;
                                            margin-right: 12px;
                                            margin-top: 2px;
                                        ">✓</span>
                                        <span style="
                                            font-size: 14px;
                                            color: white;
                                        ">Professional vectorization</span>
                                </li>
                                    <li style="
                                        display: flex;
                                        align-items: start;
                                        margin-bottom: 12px;
                                    ">
                                        <span style="
                                            color: white;
                                            margin-right: 12px;
                                            margin-top: 2px;
                                        ">✓</span>
                                        <span style="
                                            font-size: 14px;
                                            color: white;
                                        ">Priority processing</span>
                                </li>
                                    <li style="
                                        display: flex;
                                        align-items: start;
                                        margin-bottom: 12px;
                                    ">
                                        <span style="
                                            color: white;
                                            margin-right: 12px;
                                            margin-top: 2px;
                                        ">✓</span>
                                        <span style="
                                            font-size: 14px;
                                            color: white;
                                        ">Email support</span>
                                </li>
                            </ul>
                                
                                <button id="signupBasicBtnDesktop" style="
                                    width: 100%;
                                    background: white;
                                    color: #386594;
                                    border: none;
                                    padding: 12px 24px;
                                    border-radius: 8px;
                                    font-weight: bold;
                                    transition: all 0.3s;
                                    font-size: 14px;
                                    cursor: pointer;
                                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                                ">Start Basic</button>
                        </div>

                        <!-- Professional Plan -->
                            <div style="
                                position: relative;
                                background: white;
                                border: 1px solid #e5e7eb;
                                border-radius: 12px;
                                padding: 24px;
                                transition: all 0.3s;
                            ">
                                <div style="text-align: center; margin-bottom: 24px;">
                                    <h3 style="
                                        font-size: 20px;
                                        font-weight: bold;
                                        color: #111827;
                                        margin-bottom: 8px;
                                    ">Professional</h3>
                                    <div style="margin-bottom: 12px;">
                                        <span style="
                                            font-size: 32px;
                                            font-weight: bold;
                                            color: #E88B4B;
                                        ">$24.99</span>
                                        <span style="color: #6b7280;">/month</span>
                                    </div>
                                    <p style="
                                        font-size: 14px;
                                        color: #6b7280;
                                    ">For power users</p>
                                </div>
                                
                                <ul style="
                                    list-style: none;
                                    padding: 0;
                                    margin: 0 0 32px 0;
                                ">
                                    <li style="
                                        display: flex;
                                        align-items: start;
                                        margin-bottom: 12px;
                                    ">
                                        <span style="
                                            color: #059669;
                                            margin-right: 12px;
                                            margin-top: 2px;
                                        ">✓</span>
                                        <span style="
                                            font-size: 14px;
                                            color: #374151;
                                        ">60 credits per month</span>
                                </li>
                                    <li style="
                                        display: flex;
                                        align-items: start;
                                        margin-bottom: 12px;
                                    ">
                                        <span style="
                                            color: #059669;
                                            margin-right: 12px;
                                            margin-top: 2px;
                                        ">✓</span>
                                        <span style="
                                            font-size: 14px;
                                            color: #374151;
                                        ">Advanced features</span>
                                </li>
                                    <li style="
                                        display: flex;
                                        align-items: start;
                                        margin-bottom: 12px;
                                    ">
                                        <span style="
                                            color: #059669;
                                            margin-right: 12px;
                                            margin-top: 2px;
                                        ">✓</span>
                                        <span style="
                                            font-size: 14px;
                                            color: #374151;
                                        ">Unlimited processing</span>
                                </li>
                                    <li style="
                                        display: flex;
                                        align-items: start;
                                        margin-bottom: 12px;
                                    ">
                                        <span style="
                                            color: #059669;
                                            margin-right: 12px;
                                            margin-top: 2px;
                                        ">✓</span>
                                        <span style="
                                            font-size: 14px;
                                            color: #374151;
                                        ">Priority support</span>
                                </li>
                            </ul>
                                
                                <button id="signupProBtnDesktop" style="
                                    width: 100%;
                                    background-color: #E88B4B;
                                    color: white;
                                    border: none;
                                    padding: 12px 24px;
                                    border-radius: 8px;
                                    font-weight: 600;
                                    transition: all 0.3s;
                                    font-size: 14px;
                                    cursor: pointer;
                                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                                ">Start Professional</button>
                            </div>
                        </div>
                    </div>

                    <!-- Login Option -->
                    <div style="
                        text-align: center;
                        margin-top: 32px;
                        padding-top: 24px;
                        border-top: 1px solid #f3f4f6;
                    ">
                        <p style="
                            font-size: 14px;
                            color: #6b7280;
                            margin-bottom: 16px;
                        ">Already have an account?</p>
                        <button id="loginBtn" style="
                            color: #386594;
                            font-weight: 600;
                            transition: color 0.2s;
                            font-size: 14px;
                            background: none;
                            border: none;
                            cursor: pointer;
                        ">Log In</button>
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
        try {
        // Close button
            const closeBtn = document.getElementById('paywallCloseBtn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
            this.hide();
        });
            }

        // Close on backdrop click
            if (this.modal) {
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
            }

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });

            // Mobile slider functionality
            this.setupMobileSlider();

            // Signup buttons (mobile)
            const signupFreeBtn = document.getElementById('signupFreeBtn');
            if (signupFreeBtn) {
                signupFreeBtn.addEventListener('click', () => {
                    this.handleSignup('free');
                });
            }

            const signupBasicBtn = document.getElementById('signupBasicBtn');
            if (signupBasicBtn) {
                signupBasicBtn.addEventListener('click', () => {
                    this.handleSignup('basic');
                });
            }

            const signupProBtn = document.getElementById('signupProBtn');
            if (signupProBtn) {
                signupProBtn.addEventListener('click', () => {
                    this.handleSignup('professional');
                });
            }

            // Signup buttons (desktop)
            const signupFreeBtnDesktop = document.getElementById('signupFreeBtnDesktop');
            if (signupFreeBtnDesktop) {
                signupFreeBtnDesktop.addEventListener('click', () => {
            this.handleSignup('free');
        });
            }

            const signupBasicBtnDesktop = document.getElementById('signupBasicBtnDesktop');
            if (signupBasicBtnDesktop) {
                signupBasicBtnDesktop.addEventListener('click', () => {
            this.handleSignup('basic');
        });
            }

            const signupProBtnDesktop = document.getElementById('signupProBtnDesktop');
            if (signupProBtnDesktop) {
                signupProBtnDesktop.addEventListener('click', () => {
            this.handleSignup('professional');
        });
            }

        // Login button
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.addEventListener('click', () => {
            this.handleLogin();
        });
            }

            console.log('Paywall event listeners setup complete');
        } catch (error) {
            console.error('Error setting up paywall event listeners:', error);
        }
    }

    setupMobileSlider() {
        const slider = document.getElementById('planSlider');
        const prevBtn = document.getElementById('prevPlan');
        const nextBtn = document.getElementById('nextPlan');
        const dots = document.querySelectorAll('.planDot');
        
        // Check if mobile slider elements exist (only on mobile)
        if (!slider || !prevBtn || !nextBtn || dots.length === 0) {
            console.log('Mobile slider elements not found, skipping mobile slider setup');
            return;
        }
        
        let currentPlan = 0;
        const totalPlans = 3;

        const updateSlider = () => {
                            const translateX = -(currentPlan * 100);
                slider.style.transform = `translateX(${translateX}%)`;
            
            // Ensure proper alignment by adjusting container
            const container = slider.parentElement;
            container.style.display = 'flex';
            container.style.justifyContent = 'flex-start';
            
            // Ensure the active plan is fully visible
            const planCards = slider.querySelectorAll('[style*="width: 100%"]');
            planCards.forEach((card, index) => {
                if (index === currentPlan) {
                    card.style.opacity = '1';
                    card.style.transform = 'scale(1)';
                } else {
                    card.style.opacity = '0.7';
                    card.style.transform = 'scale(0.95)';
                }
            });
            
            // Update dots
            dots.forEach((dot, index) => {
                if (index === currentPlan) {
                    dot.style.backgroundColor = '#386594';
                } else {
                    dot.style.backgroundColor = '#d1d5db';
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
            // Set responsive display
            const mobileSlider = document.getElementById('mobileSlider');
            const desktopGrid = document.getElementById('desktopGrid');
            
            if (window.innerWidth < 768) {
                // Mobile view
                if (mobileSlider) mobileSlider.style.display = 'block';
                if (desktopGrid) desktopGrid.style.display = 'none';
            } else {
                // Desktop view
                if (mobileSlider) mobileSlider.style.display = 'none';
                if (desktopGrid) desktopGrid.style.display = 'block';
            }
            
            this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
            console.log('Paywall modal should now be visible');
        } else {
            console.error('Paywall modal element not found!');
        }
    }

    hide() {
        this.isVisible = false;
        if (this.modal) {
            this.modal.style.display = 'none';
        }
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