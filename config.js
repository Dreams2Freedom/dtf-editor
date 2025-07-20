// Vectorizer Pro Configuration
// Update these values to customize your website

const CONFIG = {
    // Branding
    brand: {
        name: "DTF Editor",
        tagline: "Vectorize & Remove Backgrounds",
        description: "Professional image editing tools for vectorization and background removal. Perfect for DTF printing and design work.",
        logo: null, // Add your logo URL here
        favicon: null // Add your favicon URL here
    },

    // Colors (Custom CSS System)
    colors: {
        primary: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
        },
        secondary: {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
        }
    },

    // API Configuration
    vectorizer: {
        endpoint: 'https://vectorizer.ai/api/v1/vectorize',
        id: 'vkxq4f4d9b7qwjh',
        secret: '3i3cdh559d3e1csqi2e4rsk319qdrbn2otls0flbdjqo9qmrnkfj',
        timeout: 30000, // 30 seconds
        retries: 3
    },
    clippingMagic: {
        endpoint: 'https://api.clippingmagic.com/remove-background',
        id: '24469',
        secret: 'mngg89bme2has9hojc7n5cbjr8ptg3bjc8r3v225c555nhkvv11',
        timeout: 30000, // 30 seconds
        retries: 3
    },

    // File Upload Settings
    upload: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
        maxFiles: 1
    },

    // Features
    features: [
        {
            icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z',
            title: 'Vectorization',
            description: 'Convert raster images to crisp, scalable vector graphics perfect for DTF printing and large-scale applications.'
        },
        {
            icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
            title: 'Background Removal',
            description: 'Remove backgrounds with AI precision for clean, professional results. Perfect for product photography and design.'
        },
        {
            icon: 'M13 10V3L4 14h7v7l9-11h-7z',
            title: 'Lightning Fast',
            description: 'Get your processed images in seconds, not minutes. Our optimized AI processes images quickly without compromising quality.'
        },
        {
            icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
            title: 'Secure & Private',
            description: 'Your images are processed securely and automatically deleted after processing. Your privacy is our priority.'
        }
    ],

    // Navigation
    navigation: [
        { name: 'Home', href: '#' },
        { name: 'Features', href: '#features' },
        { name: 'Pricing', href: '#' },
        { name: 'Contact', href: '#' }
    ],

    // Footer
    footer: {
        links: {
            product: [
                { name: 'Features', href: '#' },
                { name: 'Pricing', href: '#' },
                { name: 'API', href: '#' }
            ],
            support: [
                { name: 'Help Center', href: '#' },
                { name: 'Contact', href: '#' },
                { name: 'Privacy', href: '#' }
            ]
        },
        copyright: '© 2024 Vectorizer Pro. All rights reserved.'
    },

    // UI Settings
    ui: {
        animations: true,
        smoothScrolling: true,
        showProgressBar: true,
        autoScrollToResults: true
    },

    // Analytics (optional)
    analytics: {
        enabled: false,
        googleAnalyticsId: '', // Add your GA ID here
        hotjarId: '' // Add your Hotjar ID here
    },

    // Social Media
    social: {
        twitter: '',
        facebook: '',
        linkedin: '',
        instagram: ''
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
} 