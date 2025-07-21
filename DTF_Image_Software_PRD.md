# DTF Image Software - Product Requirements Document (PRD)

## 1. Executive Summary

### 1.1 Product Overview
DTF Image Software is a comprehensive web-based platform offering AI-powered image processing tools including vectorization, background removal, and AI design generation. The platform operates on a freemium model with subscription tiers and pay-as-you-go credit system.

### 1.2 Target Users
- Graphic designers and artists
- E-commerce businesses
- Print-on-demand entrepreneurs
- Marketing professionals
- Small business owners

### 1.3 Key Value Propositions
- Professional-grade image processing tools
- AI-powered design generation
- Transparent pricing with multiple tiers
- Seamless Shopify integration (future)
- User-friendly interface with drag-and-drop functionality

## 2. Technical Architecture

### 2.1 Technology Stack
- **Frontend**: React.js/Next.js with TypeScript
- **Backend**: Node.js/Express or Python/FastAPI
- **Database**: PostgreSQL with Supabase
- **Authentication**: Supabase Auth
- **Payment Processing**: Stripe
- **File Storage**: Supabase Storage or AWS S3
- **Deployment**: Railway
- **External APIs**: 
  - ClippingMagic.com (background removal)
  - Vectorizer.ai (vectorization)
  - Ideogram.ai (AI design generation)

### 2.2 System Requirements
- Responsive web design (mobile-first)
- Real-time image processing
- Secure file upload/download
- User session management
- Credit system with real-time validation
- Admin dashboard with analytics

## 3. Core Features & User Flows

### 3.1 Home Page

#### 3.1.1 Navigation Structure
```
Main Menu:
├── Vectorizer
├── Background Removal
├── AI Design
├── About Us
│   ├── Brand Story
│   └── Contact
├── Login/Logout (dynamic)
└── Dashboard (logged-in users only)
```

#### 3.1.2 Page Sections
- Hero Section with value proposition
- Tools CTA Section
- Simple, Transparent Pricing Section
- Social Proof
- Why Our Tool (benefits)
- Footer

### 3.2 Vectorizer Tool

#### 3.2.1 Page Layout
- Heading and subheading
- Modern drag-and-drop upload interface
- "Why Vectorize your images" section
- Credit cost display (1 credit per image)

#### 3.2.2 User Flow Logic
```
User Uploads Image
├── Is user logged in?
│   ├── Yes
│   │   ├── Has credits?
│   │   │   ├── Yes → Process image → Download page → Deduct 1 credit
│   │   │   └── No → Process image → Download page with "Purchase Credits" button
│   │   └── Generate preview
│   └── No → Process image → Download page → Prompt signup
```

#### 3.2.3 Credit Purchase Flow
```
No Credits Scenario:
├── Purchase Credits
│   └── Checkout → Download page with download button → Save to "My Images"
└── Upgrade Subscription
    ├── Choose subscription tier
    ├── Checkout → Download page with download button
    └── Save to "My Images"
```

### 3.3 Background Removal Tool

#### 3.3.1 Features
- Same credit system as Vectorizer (1 credit per image)
- Identical user flow and purchase logic
- Integration with ClippingMagic.com API

### 3.4 AI Design Tool

#### 3.4.1 Interface Components
- Chat box for user prompts
- Dropdown options:
  - Image size: 1x1, 9x16, 16x9, 2x1, 3x4, custom slider
  - Number of variations: 1, 2, 3
- Image upload for reference/prompt generation

#### 3.4.2 User Flow
```
Generate Images:
├── Is user logged in?
│   ├── Yes
│   │   ├── Has credits?
│   │   │   ├── Yes → Add downloadable images → Save to dashboard → Deduct credits
│   │   │   └── No → Redirect to paywall → Sales page
│   │   └── Generate preview
│   └── No → Redirect to paywall → Sales page
```

## 4. User Authentication & Management

### 4.1 Authentication System
- Single login page for users and admins
- Role-based redirects based on permissions
- Registration page
- Lost password functionality
- Session management

### 4.2 User Dashboard

#### 4.2.1 User Features
- Credit balance display
- Credits used counter
- Images generated counter
- Subscription information
- Profile management
- "My Images" gallery
- Subscription management (upgrade/downgrade/cancel)
- Usage history
- Credit top-up functionality
- Password change

#### 4.2.2 Admin Dashboard

##### 4.2.2.1 Analytics Overview
- Total users count
- Active subscribers count
- Free users count
- Monthly revenue
- Total images generated

##### 4.2.2.2 User Management
- User list with filters
- User status tracking (free/subscribed/pay-as-you-go)
- Credit balance monitoring
- Image generation statistics
- User status (active/inactive)

##### 4.2.2.3 Admin Actions
- View user details
- Soft delete users
- Hard delete users
- Deactivate users
- Edit user information
- Add/remove credits
- Cancel subscriptions
- Admin action logs

##### 4.2.2.4 Financial Analytics
- API cost tracking
- Revenue vs API cost comparison
- Weekly/monthly/yearly cost breakdown
- Revenue statistics:
  - New users vs paid users
  - Total revenue
  - Net revenue
  - Profit margin
  - API costs by service

## 5. Pricing Model

### 5.1 Freemium Structure

#### 5.1.1 Free Tier
- 2 free tool credits
- Access to vectorization and background removal
- No access to AI design
- Standard support

#### 5.1.2 Basic Plan - $9.99/month
- 20 credits per month
- Vectorization tool
- Background removal tool
- Standard support
- No AI design access

#### 5.1.3 Pro Plan - $24.99/month
- 60 credits per month
- Professional tools
- Priority processing
- Priority support
- AI design access

#### 5.1.4 Pro Plus Plan
- 120 credits per month
- Advanced features
- All Pro features included

#### 5.1.5 Pay As You Go
- 5 credits: $3.50
- 10 credits: $6.99
- 50 credits: $27.99
- 100 credits: $49.99

## 6. Technical Integrations

### 6.1 Payment Processing
- **Stripe Integration**
  - Subscription management
  - One-time payments
  - Credit card processing
  - Webhook handling

### 6.2 Infrastructure
- **Railway**: Deployment and hosting
- **Supabase**: Database, authentication, file storage

### 6.3 External APIs
- **ClippingMagic.com**: Background removal service
- **Vectorizer.ai**: Image vectorization service
- **Ideogram.ai**: AI image generation service

## 7. Future Features (Phase 2)

### 7.1 Image Enhancement
- Image upscaling functionality
- Quality improvement tools

### 7.2 Shopify Integration
- Shopify plugin development
- Direct image-to-print workflow
- Bulk ordering with discounts
- Image size and DPI detection
- Preview functionality
- Background removal integration

## 8. Development Priorities

### 8.1 Phase 1 (MVP)
1. User authentication system
2. Basic tool interfaces (Vectorizer, Background Removal)
3. Credit system implementation
4. Payment processing
5. User dashboard
6. Admin dashboard (basic)

### 8.2 Phase 2 (Enhancement)
1. AI Design tool
2. Advanced admin analytics
3. Enhanced user experience
4. Performance optimization

### 8.3 Phase 3 (Expansion)
1. Shopify integration
2. Advanced features
3. Mobile app development

## 9. Success Metrics

### 9.1 User Engagement
- Monthly active users
- Tool usage frequency
- User retention rate
- Conversion rate (free to paid)

### 9.2 Financial Metrics
- Monthly recurring revenue (MRR)
- Customer lifetime value (CLV)
- Churn rate
- Profit margins

### 9.3 Technical Metrics
- API response times
- System uptime
- Error rates
- User satisfaction scores

## 10. Risk Assessment

### 10.1 Technical Risks
- API dependency on third-party services
- Scalability challenges with image processing
- Security concerns with file uploads

### 10.2 Business Risks
- Competition from established players
- Pricing model validation
- User acquisition costs

### 10.3 Mitigation Strategies
- Implement fallback APIs
- Design scalable architecture
- Regular security audits
- A/B testing for pricing
- Focus on unique value propositions

## 11. Development Guidelines for Cursor AI

### 11.1 Code Organization
- Use TypeScript for type safety
- Implement proper error handling
- Follow RESTful API conventions
- Use environment variables for configuration
- Implement comprehensive logging

### 11.2 Security Considerations
- Input validation and sanitization
- File upload security
- API rate limiting
- Secure payment processing
- User data protection (GDPR compliance)

### 11.3 Performance Optimization
- Image compression and optimization
- CDN implementation
- Database query optimization
- Caching strategies
- Lazy loading for images

### 11.4 Testing Strategy
- Unit tests for core functions
- Integration tests for API endpoints
- End-to-end testing for user flows
- Performance testing
- Security testing

This PRD provides a comprehensive foundation for developing the DTF Image Software platform with Cursor AI, ensuring all features are properly documented and development priorities are clearly defined.