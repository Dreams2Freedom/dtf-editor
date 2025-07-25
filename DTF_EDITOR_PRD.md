# DTF Editor - Product Requirements Document (PRD)

## 📋 **1. Product Overview**

**Product Name:** DTF Editor (Direct to Film Transfers Editor)

**Core Value Proposition:** A mobile-first, user-friendly web application that helps hobbyists and small home businesses with no design experience create print-ready DTF files by fixing poor-quality images through AI-powered tools.

**Target Market:** Hobbyists and small home businesses with very low technical skill levels, currently using tools like Canva, Kittle, and occasionally Adobe Photoshop.

**Success Metrics:**

- User adoption and conversion to paid plans
- Successful creation of print-ready images (300 DPI, transparent background)
- Reduction in manual image fixing workload for your printing company

## 🎯 **2. Core Problem & Solution**

**Problem:** Users submit poor-quality images to your printing company, requiring manual fixing and resulting in subpar print quality.

**Solution:** Self-service tool that allows users to:

- Create images from scratch using AI
- Upscale poor-quality images
- Remove backgrounds for transparent backgrounds
- Vectorize bad images for better starting points

**Before vs After:**

- **Before:** Download poor image → Upload to printing site → Poor quality print
- **After:** Download poor image → Fix with DTF Editor → Upload high-quality, transparent background image → Professional print

## 👥 **3. User Personas**

**Primary User:** "Sarah the Hobbyist"

- Low technical skill level
- Uses Canva/Kittle for basic design
- Needs to create custom designs for personal projects
- Values simplicity and guided workflows

**Secondary User:** "Mike the Small Business Owner"

- Minimal design experience
- Needs professional-looking materials
- Budget-conscious but values quality
- Wants quick, reliable solutions

## 🛠️ **4. Core Features (Priority Order)**

### **4.1 Image Upscaling**

- **API:** Deep-Image.ai
- **Purpose:** Improve poor-quality images
- **Input:** JPEG, PNG
- **Output:** High-resolution image

### **4.2 Background Removal**

- **API:** ClippingMagic.com
- **Purpose:** Create transparent backgrounds
- **Input:** Any image with background
- **Output:** PNG with transparent background

### **4.3 Image Vectorization**

- **API:** Vectorizer.ai
- **Purpose:** Convert raster images to vector format
- **Input:** Poor quality images
- **Output:** Vector format for better editing

### **4.4 AI Image Generation**

- **API:** OpenAI Image Generation
- **Purpose:** Create images from prompts or uploaded references
- **Input:** Text prompts or reference images
- **Output:** Generated images
- **Restriction:** Paid plans only

## 💻 **5. Technical Requirements**

### **5.1 Platform & Performance**

- **Mobile-first design** with desktop optimization
- **Fast and smooth** performance
- **Responsive** across all devices

### **5.2 File Support**

- **Input:** JPEG, PNG, SVG, AI, PDF
- **Output:** PNG at 300 DPI with transparent background

### **5.3 Integrations**

- **AI Services:** OpenAI, Vectorizer.ai, ClippingMagic.com, Deep-Image.ai
- **Infrastructure:** Railway, Supabase
- **Payments:** Stripe
- **Marketing:** GoHighLevel, SendGrid

## 🎨 **6. Design & Branding**

### **6.1 Brand Colors**

- **Primary Blue:** #366494
- **Accent Orange:** #E88B4B
- **Dark Blue:** #233E5C
- **Light Blue:** #447CBA
- **White:** #FFFFFF

### **6.2 Design Philosophy**

- **Mobile-first** responsive design
- **Clean and intuitive** interface
- **Guided workflows** for low-tech users
- **Professional** but approachable aesthetic

## 🔄 **7. User Flow Examples**

### **7.1 New User Journey (Free Tier)**

```
1. Land on homepage → See benefits and use cases
2. Click "Upload Image" → Prompted to sign up
3. Sign up with SSO → Get 2 free credits
4. Upload poor image → Use upscale tool
5. Upscale image → Use background removal
6. Remove background → Download optimized image
7. Prompted to upgrade → Choose subscription or pay-as-you-go
8. Continue working → Image saved to "My Images"
```

### **7.2 Image Generation Flow (Paid Only)**

```
1. Logged in user → Choose "Create New Image"
2. Two options:
   a) Enter custom prompt → Generate image
   b) Upload reference image → AI creates prompt → Generate image
3. Generated image → Apply additional tools (upscale, background removal)
4. Download final image → Saved to "My Images"
```

### **7.3 Pay-as-You-Go Flow**

```
1. User runs out of credits → Prompted to purchase
2. Choose pay-as-you-go → Select credit package
3. Purchase via Stripe → Credits added immediately
4. Continue working → Image processing
5. Credits expire after 1 year → Rollover for 2 months
```

## 💰 **8. Pricing Model**

### **8.1 Free Tier**

- **Credits:** 2 per month
- **Features:** Upscale, Background Removal, Vectorization
- **Storage:** Images deleted after 48 hours
- **Restrictions:** No AI Image Generation

### **8.2 Basic Plan ($9.99/month)**

- **Credits:** 20 per month
- **Features:** All tools including AI Image Generation
- **Storage:** Images saved permanently
- **Support:** Standard support

### **8.3 Starter Plan ($24.99/month)**

- **Credits:** 60 per month
- **Features:** All tools + Professional features
- **Storage:** Images saved permanently
- **Support:** Priority support
- **Extras:** Batch processing, priority processing

### **8.4 Pay-as-You-Go**

- **10 Credits:** $7.99
- **20 Credits:** $14.99
- **50 Credits:** $29.99
- **Expiration:** 1 year validity, 2-month rollover
- **Storage:** Images deleted 90 days after last purchase

## ⚠️ **9. Error Handling Strategy**

### **9.1 API Failure Handling**

```
User uploads image → Processing starts → API fails → Show user-friendly error
```

**Error Response Strategy:**

- **Immediate Feedback:** Show processing status in real-time
- **Graceful Degradation:** If one API fails, suggest alternative tools
- **Retry Logic:** Automatic retry for transient failures (network issues)
- **User Communication:** Clear, non-technical error messages
- **Credit Protection:** Don't charge credits for failed operations
- **Fallback Options:** Suggest manual alternatives when possible

### **9.2 Specific Error Scenarios**

- **Image too large:** "Image is too large. Please resize to under 10MB"
- **API timeout:** "Processing is taking longer than expected. Please try again"
- **Invalid file type:** "Please upload a JPEG, PNG, or SVG file"
- **Network issues:** "Connection lost. Please check your internet and try again"
- **Credit exhaustion:** "You're out of credits. Upgrade your plan or purchase more"

## 📁 **10. Image Storage & Organization**

### **10.1 "My Images" Structure**

```
My Images/
├── Recent (last 10 processed images)
├── All Images (chronological order)
├── Favorites (user-starred images)
└── Collections (user-created folders)
```

### **10.2 Image Metadata**

- **Original filename**
- **Processing date/time**
- **Tools applied** (upscale, background removal, etc.)
- **File size** (before/after)
- **Credit cost** for each operation
- **Download count**
- **Favorite status**

### **10.3 Storage Rules**

- **Free users:** Auto-delete after 48 hours
- **Paid users:** Permanent storage
- **Pay-as-you-go:** Delete 90 days after last purchase
- **Maximum file size:** 10MB per image

## 👨‍💼 **11. Admin Dashboard Requirements**

### **11.1 User Management**

- **View all users** with search/filter
- **Edit user details** (name, email, subscription)
- **Add/remove credits** manually
- **Suspend/activate** user accounts
- **View user activity** and processing history

### **11.2 Subscription Management**

- **Create/edit Stripe subscription plans**
- **Create/edit pay-as-you-go credit packages**
- **Manage plan pricing** and features
- **View subscription analytics** (conversions, cancellations)

### **11.3 Financial Tracking**

- **API cost tracking** per operation
- **Credit usage analytics** by user/plan
- **Revenue reporting** (monthly, quarterly, yearly)
- **Profitability metrics** (revenue vs API costs)
- **Churn analysis** and prediction

### **11.4 Business Intelligence**

- **User segmentation** (free vs paid)
- **Conversion funnel** analysis
- **Feature usage** statistics
- **KPI dashboard** with key metrics
- **Export capabilities** for reporting

### **11.5 Key Performance Indicators (KPIs)**

- **Monthly Recurring Revenue (MRR)**
- **Customer Acquisition Cost (CAC)**
- **Customer Lifetime Value (CLV)**
- **Churn Rate**
- **Conversion Rate** (free to paid)
- **Average Revenue Per User (ARPU)**
- **API Cost per User**
- **Profit Margin**

## 🎯 **12. Success Criteria**

### **12.1 User Success**

- Successfully create print-ready images (300 DPI, transparent background)
- Complete workflows without getting stuck
- Return to use the tool again

### **12.2 Business Success**

- Reduce manual image fixing workload by 80%
- Achieve 15%+ conversion rate from free to paid
- Maintain profitable unit economics

### **12.3 Technical Success**

- Sub-3-second processing times
- 99.9% uptime
- Mobile-first responsive design

## 🏗️ **13. UI Component Structure**

### **13.1 Component Architecture**

**Framework:** React with TypeScript
**Styling:** Tailwind CSS with custom design system
**State Management:** React Context + Zustand for complex state
**UI Library:** Headless UI + Radix UI for accessible components
**Icons:** Lucide React for consistent iconography

### **13.2 Core Component Categories**

#### **Layout Components**

- `Layout` - Main app wrapper with navigation
- `Header` - Top navigation with logo, user menu, credits display
- `Sidebar` - Collapsible sidebar for desktop navigation
- `Footer` - App footer with links and info
- `Container` - Responsive content wrapper
- `Grid` - Flexible grid system for layouts

#### **Navigation Components**

- `Navbar` - Mobile-first navigation bar
- `Breadcrumb` - Page navigation breadcrumbs
- `TabGroup` - Tabbed interface for tool switching
- `Pagination` - Image gallery pagination
- `Menu` - Dropdown menus and context menus

#### **Authentication Components**

- `LoginModal` - Sign-in modal with SSO options
- `SignupModal` - Registration modal with plan selection
- `AuthGuard` - Route protection component
- `UserMenu` - User profile dropdown
- `PlanUpgrade` - Subscription upgrade prompts

#### **Image Processing Components**

- `ImageUpload` - Drag & drop file upload
- `ImagePreview` - Image display with zoom/pan
- `ProcessingStatus` - Real-time processing indicators
- `ToolSelector` - Tool selection interface
- `ImageEditor` - Main editing workspace
- `DownloadButton` - Image download with format options

#### **Tool-Specific Components**

- `UpscaleTool` - Image upscaling interface
- `BackgroundRemovalTool` - Background removal interface
- `VectorizationTool` - Vectorization interface
- `ImageGenerationTool` - AI image generation interface
- `PromptBuilder` - AI prompt creation interface

#### **Gallery & Storage Components**

- `ImageGallery` - Grid/list view of user images
- `ImageCard` - Individual image display card
- `ImageDetails` - Image metadata and actions
- `CollectionManager` - Folder/collection management
- `SearchFilter` - Image search and filtering

#### **Payment & Subscription Components**

- `PricingTable` - Plan comparison table
- `CreditDisplay` - Current credit balance
- `PurchaseModal` - Pay-as-you-go purchase flow
- `SubscriptionManager` - Plan management interface
- `BillingHistory` - Payment history display

#### **Admin Components**

- `AdminDashboard` - Main admin interface
- `UserManagement` - User list and management
- `AnalyticsChart` - Data visualization components
- `RevenueMetrics` - Financial metrics display
- `SystemStatus` - API and service status

#### **Feedback & Communication Components**

- `Toast` - Success/error notifications
- `LoadingSpinner` - Loading states
- `ProgressBar` - Processing progress
- `ErrorBoundary` - Error handling wrapper
- `HelpTooltip` - Contextual help system

#### **Form Components**

- `Input` - Text input with validation
- `Select` - Dropdown selection
- `Checkbox` - Checkbox with labels
- `RadioGroup` - Radio button groups
- `Textarea` - Multi-line text input
- `FileInput` - File upload input

#### **Data Display Components**

- `Table` - Data tables with sorting/filtering
- `Card` - Content cards with actions
- `Badge` - Status and category badges
- `Avatar` - User profile images
- `Stats` - Metric display cards

### **13.3 Design System**

#### **Color Palette**

```css
/* Primary Colors */
--primary-blue: #366494;
--accent-orange: #e88b4b;
--dark-blue: #233e5c;
--light-blue: #447cba;
--white: #ffffff;

/* Semantic Colors */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;

/* Neutral Colors */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;
```

#### **Typography Scale**

```css
/* Font Sizes */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
--text-4xl: 2.25rem;
--text-5xl: 3rem;
```

#### **Spacing Scale**

```css
/* Spacing */
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-5: 1.25rem;
--space-6: 1.5rem;
--space-8: 2rem;
--space-10: 2.5rem;
--space-12: 3rem;
--space-16: 4rem;
--space-20: 5rem;
```

#### **Border Radius**

```css
/* Border Radius */
--radius-sm: 0.125rem;
--radius-md: 0.375rem;
--radius-lg: 0.5rem;
--radius-xl: 0.75rem;
--radius-2xl: 1rem;
--radius-full: 9999px;
```

#### **Shadows**

```css
/* Shadows */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
```

### **13.4 Responsive Breakpoints**

```css
/* Mobile First */
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

### **13.5 Component Naming Convention**

- **PascalCase** for component names: `ImageUpload`, `ProcessingStatus`
- **camelCase** for props and variables: `imageUrl`, `isProcessing`
- **kebab-case** for CSS classes: `image-upload`, `processing-status`
- **Prefix with category** for organization: `ui-Button`, `form-Input`

### **13.6 File Structure**

```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   ├── layout/       # Layout components
│   ├── auth/         # Authentication components
│   ├── image/        # Image processing components
│   ├── gallery/      # Gallery and storage components
│   ├── payment/      # Payment and subscription components
│   ├── admin/        # Admin dashboard components
│   └── feedback/     # Toast, loading, error components
├── hooks/            # Custom React hooks
├── utils/            # Utility functions
├── types/            # TypeScript type definitions
├── styles/           # Global styles and design system
└── constants/        # App constants and configuration
```

## 🏗️ **14. Technical Architecture Overview**

### **Frontend (React/Next.js)**

- Mobile-first responsive design
- Real-time processing status
- Intuitive image upload/processing flow
- Admin dashboard with analytics

### **Backend (Node.js/Express)**

- API gateway for all external services
- Credit management system
- Image processing pipeline
- User authentication & authorization

### **Database (Supabase)**

- User management
- Image metadata storage
- Credit tracking
- Processing history
- Admin analytics

### **External Integrations**

- **AI Services:** OpenAI, Vectorizer.ai, ClippingMagic, Deep-Image.ai
- **Payments:** Stripe (subscriptions + pay-as-you-go)
- **Infrastructure:** Railway, Supabase
- **Marketing:** GoHighLevel, SendGrid

## 🔌 **15. API Integration Documentation**

### **15.1 AI Service APIs**

#### **OpenAI Image Generation API**

**Purpose:** Generate images from text prompts or reference images
**Endpoint:** `https://api.openai.com/v1/images/generations`
**Authentication:** Bearer token
**Rate Limits:** Varies by plan

**Request Format:**

```json
{
  "model": "dall-e-3",
  "prompt": "A professional logo design for a coffee shop",
  "n": 1,
  "size": "1024x1024",
  "quality": "standard",
  "response_format": "url"
}
```

**Response Format:**

```json
{
  "created": 1589478378,
  "data": [
    {
      "url": "https://oaidalleapiprodscus.blob.core.windows.net/private/...",
      "revised_prompt": "A professional logo design for a coffee shop..."
    }
  ]
}
```

**Error Handling:**

- **Rate limit exceeded:** Retry with exponential backoff
- **Invalid prompt:** Return user-friendly error
- **API key issues:** Log and notify admin

**Credit Cost:** 1 credit per generation

#### **Deep-Image.ai Upscaling API**

**Purpose:** Upscale low-resolution images to high quality
**Endpoint:** `https://api.deep-image.ai/rest_api`
**Authentication:** API key in headers
**Rate Limits:** Based on subscription tier

**Request Format:**

```json
{
  "image": "base64_encoded_image_data",
  "scale": 2,
  "face_enhance": false,
  "type": "photo"
}
```

**Response Format:**

```json
{
  "status": "success",
  "url": "https://deep-image.ai/result/upscaled_image.jpg",
  "processing_time": 15.2
}
```

**Error Handling:**

- **File too large:** Compress before sending
- **Processing timeout:** Implement retry logic
- **Invalid format:** Validate file type before sending

**Credit Cost:** 1 credit per upscale

#### **ClippingMagic Background Removal API**

**Purpose:** Remove backgrounds from images
**Endpoint:** `https://api.clippingmagic.com/api/v1/image`
**Authentication:** API key in headers
**Rate Limits:** Based on plan

**Request Format:**

```json
{
  "image": "base64_encoded_image_data",
  "format": "png",
  "bg_color": "transparent",
  "scale": "original"
}
```

**Response Format:**

```json
{
  "status": "success",
  "result": {
    "url": "https://clippingmagic.com/result/processed_image.png",
    "processing_time": 8.5
  }
}
```

**Error Handling:**

- **Complex backgrounds:** Suggest manual editing
- **Processing failures:** Retry with different settings
- **File size limits:** Compress if needed

**Credit Cost:** 1 credit per background removal

#### **Vectorizer.ai Vectorization API**

**Purpose:** Convert raster images to vector format
**Endpoint:** `https://api.vectorizer.ai/api/vectorize`
**Authentication:** API key in headers
**Rate Limits:** Based on subscription

**Request Format:**

```json
{
  "image": "base64_encoded_image_data",
  "format": "svg",
  "colors": "auto",
  "details": "high"
}
```

**Response Format:**

```json
{
  "status": "success",
  "result": {
    "url": "https://vectorizer.ai/result/vectorized_image.svg",
    "processing_time": 12.3,
    "file_size": "45.2KB"
  }
}
```

**Error Handling:**

- **Complex images:** Suggest simpler alternatives
- **Processing timeouts:** Implement progress indicators
- **Format issues:** Validate input before processing

**Credit Cost:** 2 credits per vectorization

### **15.2 Payment & Subscription APIs**

#### **Stripe API Integration**

**Purpose:** Handle subscriptions and pay-as-you-go payments
**Endpoints:** Multiple (payments, subscriptions, customers)
**Authentication:** Secret key for backend, publishable key for frontend

**Subscription Creation:**

```javascript
// Create subscription
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: 'price_monthly_basic' }],
  payment_behavior: 'default_incomplete',
  expand: ['latest_invoice.payment_intent'],
});
```

**Pay-as-You-Go Purchase:**

```javascript
// Create one-time payment
const paymentIntent = await stripe.paymentIntents.create({
  amount: 999, // $9.99 in cents
  currency: 'usd',
  customer: customerId,
  metadata: {
    credits: '10',
    type: 'pay_as_you_go',
  },
});
```

**Webhook Events:**

- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Plan changes
- `customer.subscription.deleted` - Cancellations
- `invoice.payment_succeeded` - Successful payments
- `invoice.payment_failed` - Failed payments

**Error Handling:**

- **Payment failures:** Retry with different payment method
- **Insufficient funds:** Suggest alternative payment methods
- **Card declined:** Provide clear error messages

### **15.3 Infrastructure APIs**

#### **Supabase API**

**Purpose:** Database operations, authentication, file storage
**Endpoints:** REST API and real-time subscriptions
**Authentication:** JWT tokens

**User Management:**

```javascript
// Create user
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
});

// Get user profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

**File Storage:**

```javascript
// Upload image
const { data, error } = await supabase.storage
  .from('user-images')
  .upload(`${userId}/${filename}`, file);

// Get public URL
const {
  data: { publicUrl },
} = supabase.storage.from('user-images').getPublicUrl(`${userId}/${filename}`);
```

**Real-time Subscriptions:**

```javascript
// Subscribe to user's images
const subscription = supabase
  .from('images')
  .on('INSERT', payload => {
    console.log('New image:', payload.new);
  })
  .subscribe();
```

#### **Railway API**

**Purpose:** Deployment and infrastructure management
**Endpoints:** REST API for deployment management
**Authentication:** API tokens

**Deployment:**

```javascript
// Trigger deployment
const response = await fetch('https://api.railway.app/v2/deployments', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${RAILWAY_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    serviceId: SERVICE_ID,
    environment: 'production',
  }),
});
```

### **15.4 Marketing & Communication APIs**

#### **GoHighLevel API**

**Purpose:** Marketing automation and customer management
**Endpoints:** REST API for contact management
**Authentication:** API key

**Contact Management:**

```javascript
// Create contact
const contact = await ghl.createContact({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1234567890',
  tags: ['dtf-editor-user', 'free-tier'],
});

// Add to funnel
await ghl.addToFunnel(contactId, 'dtf-editor-onboarding');
```

**Automation Triggers:**

- **New user signup** - Welcome sequence
- **First image processed** - Tutorial emails
- **Credit exhaustion** - Upgrade prompts
- **Subscription upgrade** - Success sequence

#### **SendGrid API**

**Purpose:** Transactional email delivery
**Endpoints:** REST API for email sending
**Authentication:** API key

**Email Templates:**

```javascript
// Send welcome email
await sgMail.send({
  to: 'user@example.com',
  from: 'noreply@dtfeditor.com',
  templateId: 'd-welcome-template-id',
  dynamicTemplateData: {
    firstName: 'John',
    credits: 2,
    upgradeUrl: 'https://dtfeditor.com/upgrade',
  },
});
```

**Email Types:**

- **Welcome emails** - New user onboarding
- **Processing notifications** - Image ready for download
- **Credit alerts** - Low balance warnings
- **Subscription updates** - Plan changes and billing

### **15.5 API Integration Architecture**

#### **API Gateway Pattern**

```javascript
// Centralized API management
class APIGateway {
  async processImage(imageData, operations) {
    const results = [];

    for (const operation of operations) {
      try {
        const result = await this.callAPI(operation.type, imageData);
        results.push(result);
      } catch (error) {
        await this.handleAPIError(error, operation);
      }
    }

    return results;
  }

  async callAPI(type, data) {
    switch (type) {
      case 'upscale':
        return await this.deepImageAPI.upscale(data);
      case 'background-removal':
        return await this.clippingMagicAPI.removeBackground(data);
      case 'vectorize':
        return await this.vectorizerAPI.vectorize(data);
      case 'generate':
        return await this.openAIAPI.generateImage(data);
    }
  }
}
```

#### **Error Handling Strategy**

```javascript
// Comprehensive error handling
class APIErrorHandler {
  async handleError(error, operation, userId) {
    // Log error for debugging
    await this.logError(error, operation, userId);

    // Determine error type
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      return this.handleRateLimit(error, operation);
    } else if (error.code === 'INVALID_INPUT') {
      return this.handleInvalidInput(error, operation);
    } else if (error.code === 'API_UNAVAILABLE') {
      return this.handleServiceUnavailable(error, operation);
    }

    // Generic error handling
    return this.handleGenericError(error, operation);
  }

  async handleRateLimit(error, operation) {
    // Implement exponential backoff
    const retryAfter = this.calculateRetryTime(error);
    await this.scheduleRetry(operation, retryAfter);

    return {
      status: 'retry_scheduled',
      message: 'Processing will resume shortly',
      retryTime: retryAfter,
    };
  }
}
```

#### **Credit Management Integration**

```javascript
// Credit tracking for all API calls
class CreditManager {
  async processWithCredits(userId, operation, apiCall) {
    const cost = this.getOperationCost(operation);

    // Check if user has enough credits
    const hasCredits = await this.checkCredits(userId, cost);
    if (!hasCredits) {
      throw new Error('Insufficient credits');
    }

    try {
      // Deduct credits before API call
      await this.deductCredits(userId, cost);

      // Make API call
      const result = await apiCall();

      // Log successful operation
      await this.logOperation(userId, operation, cost, 'success');

      return result;
    } catch (error) {
      // Refund credits on failure
      await this.refundCredits(userId, cost);
      await this.logOperation(userId, operation, cost, 'failed');
      throw error;
    }
  }
}
```

### **15.6 API Rate Limiting & Optimization**

#### **Rate Limit Management**

- **OpenAI:** 50 requests/minute (free), 3500 requests/minute (paid)
- **Deep-Image.ai:** 100 requests/hour (basic), 1000 requests/hour (pro)
- **ClippingMagic:** 100 requests/day (free), 1000 requests/day (paid)
- **Vectorizer.ai:** 50 requests/day (free), 500 requests/day (paid)

#### **Optimization Strategies**

- **Request queuing** for high-traffic periods
- **Caching** of processed images
- **Batch processing** where possible
- **Progressive loading** for large images
- **Compression** before API calls

#### **Monitoring & Analytics**

- **API response times** tracking
- **Success/failure rates** monitoring
- **Cost per operation** analysis
- **User behavior** patterns
- **Peak usage** identification

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Approved for Development
