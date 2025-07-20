// Mobile Navigation Handler
class MobileNavigation {
    constructor() {
        this.hamburgerBtn = document.getElementById('hamburgerBtn');
        this.mobileNav = document.getElementById('mobileNav');
        this.mobileOverlay = document.getElementById('mobileOverlay');
        this.isOpen = false;
        
        this.init();
    }

    init() {
        if (!this.hamburgerBtn || !this.mobileNav || !this.mobileOverlay) {
            console.warn('Mobile navigation elements not found');
            return;
        }

        this.setupEventListeners();
        this.syncAuthButtons();
    }

    setupEventListeners() {
        // Hamburger button click
        this.hamburgerBtn.addEventListener('click', () => {
            this.toggleMenu();
        });

        // Overlay click to close
        this.mobileOverlay.addEventListener('click', () => {
            this.closeMenu();
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        });

        // Close menu on window resize (if switching to desktop)
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.isOpen) {
                this.closeMenu();
            }
        });

        // Close menu when clicking on mobile nav links
        const mobileNavLinks = this.mobileNav.querySelectorAll('.mobile-nav-link');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.closeMenu();
            });
        });
    }

    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        this.isOpen = true;
        this.hamburgerBtn.classList.add('active');
        this.mobileNav.classList.add('active');
        this.mobileOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    closeMenu() {
        this.isOpen = false;
        this.hamburgerBtn.classList.remove('active');
        this.mobileNav.classList.remove('active');
        this.mobileOverlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }

    syncAuthButtons() {
        // Sync auth buttons between desktop and mobile
        const desktopAuthContainer = document.getElementById('authContainer');
        const mobileAuthContainer = document.getElementById('mobileAuthContainer');
        
        if (desktopAuthContainer && mobileAuthContainer) {
            // Clone auth buttons to mobile container
            const cloneAuthButtons = () => {
                mobileAuthContainer.innerHTML = desktopAuthContainer.innerHTML;
                
                // Update any auth-related classes for mobile
                const mobileAuthButtons = mobileAuthContainer.querySelectorAll('.btn-nav');
                mobileAuthButtons.forEach(btn => {
                    btn.classList.remove('btn-nav');
                    btn.classList.add('mobile-nav-link');
                });
            };

            // Initial sync
            cloneAuthButtons();

            // Watch for changes in desktop auth container
            const observer = new MutationObserver(cloneAuthButtons);
            observer.observe(desktopAuthContainer, {
                childList: true,
                subtree: true
            });
        }
    }
}

// Initialize mobile navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MobileNavigation();
}); 