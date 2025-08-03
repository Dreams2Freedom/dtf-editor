#!/bin/bash

echo "🚀 DTFEditor.com Test Mode Deployment Script"
echo "============================================"
echo ""
echo "This script will help you deploy to Vercel with Stripe TEST keys"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Generate CRON_SECRET if not provided
CRON_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}✅ Generated CRON_SECRET:${NC} $CRON_SECRET"
echo ""

echo -e "${YELLOW}📋 Step 1: Login to Vercel${NC}"
echo "Running: npx vercel login"
npx vercel login

echo ""
echo -e "${YELLOW}📋 Step 2: Link to Vercel Project${NC}"
echo "Running: npx vercel link"
echo "- Select your team/account"
echo "- Choose 'Link to existing project' if you already created one"
echo "- Or create a new project named 'dtf-editor'"
npx vercel link

echo ""
echo -e "${YELLOW}📋 Step 3: Setting Environment Variables${NC}"
echo "We'll now set all environment variables for production..."
echo ""

# Function to set env var
set_env_var() {
    local var_name=$1
    local var_value=$2
    local env_type=$3
    
    echo -e "Setting ${GREEN}$var_name${NC}..."
    echo "$var_value" | npx vercel env add "$var_name" $env_type --force
}

# Read values from .env.local
if [ -f .env.local ]; then
    echo "Reading values from .env.local..."
    
    # Parse .env.local
    export $(cat .env.local | grep -v '^#' | xargs)
    
    # Set production environment variables
    echo ""
    echo -e "${YELLOW}Setting Supabase variables...${NC}"
    set_env_var "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL" "production preview"
    set_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY" "production preview"
    set_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "production"
    
    echo ""
    echo -e "${YELLOW}Setting AI Service variables...${NC}"
    set_env_var "DEEP_IMAGE_API_KEY" "$DEEP_IMAGE_API_KEY" "production"
    set_env_var "CLIPPINGMAGIC_API_KEY" "$CLIPPINGMAGIC_API_KEY" "production"
    set_env_var "CLIPPINGMAGIC_API_SECRET" "$CLIPPINGMAGIC_API_SECRET" "production"
    set_env_var "VECTORIZER_API_KEY" "$VECTORIZER_API_KEY" "production"
    set_env_var "VECTORIZER_API_SECRET" "$VECTORIZER_API_SECRET" "production"
    set_env_var "OPENAI_API_KEY" "${OPENAI_API_KEY:-placeholder}" "production"
    
    echo ""
    echo -e "${YELLOW}Setting Stripe TEST variables...${NC}"
    set_env_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "${STRIPE_PUBLISHABLE_KEY:-$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}" "production preview"
    set_env_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY" "production"
    set_env_var "STRIPE_WEBHOOK_SECRET" "whsec_test_placeholder" "production"
    
    # Stripe Price IDs
    set_env_var "STRIPE_BASIC_PLAN_PRICE_ID" "$STRIPE_BASIC_PLAN_PRICE_ID" "production"
    set_env_var "STRIPE_STARTER_PLAN_PRICE_ID" "$STRIPE_STARTER_PLAN_PRICE_ID" "production"
    set_env_var "STRIPE_PAYG_10_CREDITS_PRICE_ID" "$STRIPE_PAYG_10_CREDITS_PRICE_ID" "production"
    set_env_var "STRIPE_PAYG_20_CREDITS_PRICE_ID" "$STRIPE_PAYG_20_CREDITS_PRICE_ID" "production"
    set_env_var "STRIPE_PAYG_50_CREDITS_PRICE_ID" "$STRIPE_PAYG_50_CREDITS_PRICE_ID" "production"
    
    echo ""
    echo -e "${YELLOW}Setting Mailgun variables...${NC}"
    set_env_var "MAILGUN_API_KEY" "$MAILGUN_API_KEY" "production"
    set_env_var "MAILGUN_DOMAIN" "${MAILGUN_DOMAIN:-mg.dtfeditor.com}" "production"
    set_env_var "MAILGUN_FROM_EMAIL" "${MAILGUN_FROM_EMAIL:-noreply@mg.dtfeditor.com}" "production"
    set_env_var "MAILGUN_FROM_NAME" "${MAILGUN_FROM_NAME:-DTF Editor}" "production"
    
    echo ""
    echo -e "${YELLOW}Setting App Configuration...${NC}"
    set_env_var "NEXT_PUBLIC_APP_URL" "https://dtfeditor.com" "production preview"
    set_env_var "CRON_SECRET" "$CRON_SECRET" "production"
    
else
    echo -e "${RED}❌ Error: .env.local file not found!${NC}"
    echo "Please ensure you're in the project root directory"
    exit 1
fi

echo ""
echo -e "${YELLOW}📋 Step 4: Deploy to Production${NC}"
echo "Running: npx vercel --prod"
npx vercel --prod

echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Go to your Vercel dashboard and add custom domain: dtfeditor.com"
echo "2. Set up Stripe TEST webhook:"
echo "   - URL: https://dtfeditor.com/api/webhooks/stripe"
echo "   - Copy the signing secret"
echo "   - Update STRIPE_WEBHOOK_SECRET in Vercel"
echo "3. Verify the yellow TEST MODE banner appears on the site"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "- We're using Stripe TEST keys for safe testing"
echo "- The generated CRON_SECRET is: $CRON_SECRET"
echo "- Save this somewhere safe!"
echo ""
echo -e "${GREEN}🎉 Ready for testing!${NC}"