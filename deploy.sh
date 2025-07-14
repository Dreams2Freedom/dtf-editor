#!/bin/bash

# 🚀 DTF Editor - Quick Deploy Script
# This script helps you deploy your DTF Editor to Vercel

echo "🚀 DTF Editor Deployment Script"
echo "================================"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Error: index.html not found. Make sure you're in the DTF Editor directory."
    exit 1
fi

echo "✅ Found DTF Editor files"

# Check if vercel.json exists
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: vercel.json not found. Please ensure all deployment files are present."
    exit 1
fi

echo "✅ Found Vercel configuration"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
echo "This will open a browser window for authentication if needed."

vercel --prod

echo ""
echo "🎉 Deployment complete!"
echo "Your DTF Editor should now be live at the URL shown above."
echo ""
echo "📋 Next steps:"
echo "1. Test the vectorization feature"
echo "2. Set up a custom domain (optional)"
echo "3. Monitor usage in Vercel dashboard"
echo ""
echo "🔧 To update your deployment later, just run:"
echo "   vercel --prod" 