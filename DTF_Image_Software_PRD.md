# DTF Image Software - Product Requirements Document

## Table of Contents
1. [Product Overview](#product-overview)
2. [Technical Architecture](#technical-architecture)
3. [User Authentication & Authorization](#user-authentication--authorization)
4. [Feature Specifications](#feature-specifications)
5. [User Journey Flows](#user-journey-flows)
6. [Pricing & Monetization](#pricing--monetization)
7. [Third-Party Integrations](#third-party-integrations)
8. [Admin Dashboard Requirements](#admin-dashboard-requirements)
9. [Future Roadmap](#future-roadmap)
10. [Development Guidelines for Cursor AI](#development-guidelines-for-cursor-ai)

---

## Product Overview

### Vision
A comprehensive DTF (Direct-to-Film) image processing platform offering AI-powered vectorization, background removal, and AI design generation with a freemium subscription model.

### Core Value Proposition
- Professional-grade image processing tools
- AI-powered design generation
- Credit-based usage system
- Seamless user experience from processing to download

---

## Technical Architecture

### Tech Stack
- **Backend**: Node.js/Express or Python/FastAPI
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payment Processing**: Stripe
- **Hosting**: Railway
- **File Storage**: Supabase Storage or AWS S3
- **Frontend**: React/Next.js or Vue.js

### Database Schema Requirements
```sql
-- Users table
users (
  id, email, password_hash, created_at, updated_at,
  subscription_tier, credits_remaining, total_credits_purchased,
  is_active, is_admin, profile_info
)

-- Images table
user_images (
  id, user_id, original_filename, processed_filename,
  tool_used, credits_consumed, created_at, file_size,
  processing_status, download_count
)

-- Subscriptions table
subscriptions (
  id, user_id, stripe_subscription_id, plan_type,
  status, current_period_start, current_period_end,
  credits_per_month, created_at, updated_at
)

-- Credit transactions
credit_transactions (
  id, user_id, transaction_type, credits_amount,
  cost, stripe_payment_intent_id, created_at
)

-- Admin logs
admin_logs (
  id, admin_user_id, action_type, target_user_id,
  details, created_at
)
```

---

## User Authentication & Authorization

### User Roles
1. **Guest Users**: Limited access, no account required
2. **Free Users**: 2 free credits, no AI Design access
3. **Basic Subscribers**: $9.99/month, 20 credits, no AI Design
4. **Pro Subscribers**: $24.99/month, 60 credits, AI Design access
5. **Pro Plus Subscribers**: Custom pricing, 120 credits, all features
6. **Admins**: Full system access and management

### Authentication Flow
- Single login page for all user types
- Role-based redirection after login
- JWT tokens for session management
- Password reset functionality
- Registration with email verification

---

## Feature Specifications

### 1. Home Page Components

#### Navigation Header
- Logo and branding
- Main menu: Vectorizer, Background Removal, AI Design, About Us
- Login/Logout toggle based on authentication state
- Dashboard link (visible only when logged in)

#### Hero Section
- Value proposition headline
- Primary CTA button
- Hero image/video

#### Tools CTA Section
- Feature highlights for each tool
- Direct links to tool pages

#### Pricing Section
- Transparent pricing table
- Feature comparison
- CTA buttons for each tier

#### Social Proof Section
- Customer testimonials
- Usage statistics
- Trust badges

#### Benefits Section
- "Why Our Tool" content
- "Benefits of Using Our Tool" content

#### Footer
- Links, contact info, legal pages

### 2. DTF Tools

#### A. Vectorizer Tool
**Page Components:**
- Heading and subheading
- Modern drag-and-drop upload interface
- "Why Vectorize Your Images" educational content
- Processing status indicator
- Preview/download interface

**Functionality:**
- File upload validation (formats, size limits)
- Integration with Vectorizer.ai API
- Real-time processing status
- Credit consumption tracking
- High-resolution output generation

**Credit Cost:** 1 credit per image

#### B. Background Removal Tool
**Page Components:**
- Similar layout to Vectorizer
- Upload interface
- Before/after preview
- Download interface

**Functionality:**
- Integration with ClippingMagic.com API
- Real-time processing
- Preview generation
- Credit consumption tracking

**Credit Cost:** 1 credit per image

#### C. AI Image Design Tool
**Page Components:**
- Chat interface for prompts
- Dropdown options:
  - Image sizes: 1x1, 9x16, 16x9, 2x1, 3x4, Custom (slider)
  - Number of variations: 1, 2, 3
- Upload option for reference images
- Generated image gallery
- Download interface

**Functionality:**
- Integration with Ideogram.ai API
- Prompt processing and image generation
- Multiple variation handling
- Reference image analysis
- Credit consumption per generation

---

## User Journey Flows

### 1. Tool Usage Flow (Vectorizer & Background Removal)

```
User accesses tool
├── User logged in?
    ├── YES
    │   ├── Has credits?
    │   │   ├── YES → Full access → Process → Download → Save to "My Images"
    │   │   └── NO → Full access → Process → Paywall → Purchase/Upgrade → Download
    │   └── Process with preview only
    └── NO → Full access → Process → Download page → Signup prompt → Sales page
```

### 2. AI Design Tool Flow

```
User enters prompt + selects options
├── Generate previews
├── User logged in?
    ├── YES
    │   ├── Has credits?
    │   │   ├── YES → Generate full resolution → Download → Save to dashboard
    │   │   └── NO → Paywall → Purchase/Upgrade → Generate → Download
    │   └── Deduct credits
    └── NO → Signup prompt → Sales page
```

### 3. Payment Flow

```
User needs credits/subscription
├── Choose option
    ├── Buy Credits → Stripe checkout → Credit pack → Return to tool
    ├── Upgrade Subscription → Plan selection → Stripe checkout → Return to tool
    └── Cancel → Sales page → More info page
```

---

## Pricing & Monetization

### Subscription Tiers

#### Free Tier
- **Price**: $0
- **Credits**: 2 free tool credits
- **Features**: Vectorization, Background removal
- **Limitations**: No AI Design access

#### Basic Plan
- **Price**: $9.99/month
- **Credits**: 20 credits per month
- **Features**: 
  - ✓ Vectorization Tool
  - ✓ Background removal tool
  - ✓ Standard support
  - ✗ No AI Design access

#### Pro Plan
- **Price**: $24.99/month
- **Credits**: 60 credits per month
- **Features**:
  - ✓ Professional tools
  - ✓ Priority processing
  - ✓ Priority support
  - ✓ AI Design access

#### Pro Plus Plan
- **Price**: Custom pricing
- **Credits**: 120 credits per month
- **Features**:
  - ✓ Advanced features
  - ✓ Everything in Pro
  - ✓ Premium support

### Pay-As-You-Go Options
- 5 Credits: $3.50
- 10 Credits: $6.99
- 50 Credits: $27.99
- 100 Credits: $49.99

---

## Third-Party Integrations

### Required Integrations

#### 1. Stripe Integration
- Subscription management
- One-time payments for credit packs
- Webhook handling for payment events
- Invoice generation

#### 2. Supabase Integration
- User authentication
- Database management
- File storage
- Real-time subscriptions

#### 3. Railway Integration
- Application hosting
- Environment management
- CI/CD pipeline

#### 4. API Integrations
- **ClippingMagic.com**: Background removal processing
- **Vectorizer.ai**: Image vectorization
- **Ideogram.ai**: AI image generation

---

## Admin Dashboard Requirements

### Analytics Dashboard
- Total users count
- Active subscribers
- Free users count
- Monthly revenue tracking
- Total images generated
- API cost tracking vs revenue

### User Management
**User List View:**
- User type (Free/Subscribed/Pay-as-you-go)
- Credit balance
- Total images generated
- Monthly image count
- Account status (Active/Inactive)

**Action Buttons:**
- View Details
- Soft Delete
- Hard Delete
- Deactivate Account
- Edit User
- Add/Remove Credits
- Cancel Subscription

### Financial Analytics
- New users vs paid conversion
- Total revenue
- Net revenue
- API costs by service
- Profit margins
- Revenue filtering by date ranges

### System Monitoring
- Admin action logs
- API usage statistics
- Processing queue status
- Error tracking

---

## Future Roadmap

### Phase 1 (Current Development)
- Core tool functionality
- User authentication
- Basic subscription system

### Phase 2 (Next 3-6 months)
- Image upscaling feature
- Enhanced AI design capabilities
- Mobile app development

### Phase 3 (6-12 months)
- Shopify integration plugin
- Bulk processing capabilities
- Advanced admin analytics

### Shopify Integration Specifications
- Plugin for direct store integration
- Image dimension detection (height, width, DPI)
- Preview window functionality
- Background removal integration
- Bulk ordering system
- Volume discount structure
- Credit-free processing for store orders

---

## Development Guidelines for Cursor AI

### Project Structure
```
dtf-image-software/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── auth/
│   │   │   ├── tools/
│   │   │   ├── dashboard/
│   │   │   └── admin/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── models/
│   │   └── utils/
├── shared/
│   ├── types/
│   └── constants/
└── docs/
```

### Key Development Priorities

1. **Authentication System**
   - Implement Supabase Auth
   - Role-based access control
   - Session management

2. **Credit System**
   - Credit tracking and consumption
   - Transaction logging
   - Subscription management

3. **File Processing Pipeline**
   - Upload handling
   - API integration queue
   - Status tracking
   - Error handling

4. **Payment Integration**
   - Stripe subscription setup
   - Webhook handlers
   - Credit purchase flow

5. **User Dashboard**
   - Credit display
   - Image gallery
   - Usage analytics
   - Account management

6. **Admin Panel**
   - User management
   - Analytics dashboard
   - System monitoring

### API Endpoints Structure

```
Authentication:
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
POST /api/auth/reset-password

Tools:
POST /api/tools/vectorize
POST /api/tools/remove-background
POST /api/tools/ai-design

User Management:
GET /api/user/profile
PUT /api/user/profile
GET /api/user/credits
GET /api/user/images
GET /api/user/usage

Payment:
POST /api/payment/create-subscription
POST /api/payment/purchase-credits
POST /api/payment/webhook

Admin:
GET /api/admin/users
GET /api/admin/analytics
PUT /api/admin/user/:id
DELETE /api/admin/user/:id
```

### Environment Variables Required
```
# Database
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Payment
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# API Services
VECTORIZER_API_KEY=
CLIPPING_MAGIC_API_KEY=
IDEOGRAM_API_KEY=

# App Configuration
JWT_SECRET=
APP_URL=
RAILWAY_ENVIRONMENT=
```

### Testing Strategy
- Unit tests for core business logic
- Integration tests for API endpoints
- E2E tests for critical user journeys
- Payment flow testing with Stripe test mode

### Security Considerations
- Input validation and sanitization
- Rate limiting on API endpoints
- File upload security
- Payment data handling compliance
- User data privacy protection

---

This PRD provides a comprehensive blueprint for developing the DTF Image Software platform using Cursor AI, with clear specifications, user flows, and technical requirements that will enable smooth development and implementation.