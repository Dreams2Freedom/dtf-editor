# Comprehensive Testing Plan - Vectorizer Website

## 🚨 CRITICAL ISSUE: User Signup Blocked

### Current Problem
- **Error**: "infinite recursion detected in policy for relation 'profiles'"
- **Impact**: Users cannot create accounts, blocking all functionality
- **Root Cause**: Supabase RLS (Row Level Security) policy configuration issue

### Immediate Fix Required
1. **Check Supabase RLS Policies**
   - Navigate to Supabase Dashboard → Authentication → Policies
   - Review policies on `profiles` table
   - Look for circular references or infinite loops in policy conditions

2. **Temporary Workaround**
   - Disable RLS on `profiles` table temporarily for testing
   - Or create a simple policy: `CREATE POLICY "Enable read/write for authenticated users" ON profiles FOR ALL USING (auth.uid() = id);`

---

## 📋 Complete Testing Plan

### Phase 1: Fix User Authentication (CRITICAL)

#### 1.1 Database Schema Verification
- [ ] **Check Supabase Tables**
  ```sql
  -- Run in Supabase SQL Editor
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'users', 'credit_transactions');
  ```

- [ ] **Verify RLS Policies**
  ```sql
  -- Check existing policies
  SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
  FROM pg_policies 
  WHERE tablename = 'profiles';
  ```

- [ ] **Fix Profiles Table Policy**
  ```sql
  -- Drop problematic policies
  DROP POLICY IF EXISTS "profiles_policy" ON profiles;
  
  -- Create simple, working policy
  CREATE POLICY "Enable read/write for authenticated users" 
  ON profiles FOR ALL 
  USING (auth.uid() = id);
  ```

#### 1.2 User Registration Testing
- [ ] **Signup Flow**
  - [ ] Navigate to `/auth/signup`
  - [ ] Fill out registration form with test data
  - [ ] Verify email confirmation (if enabled)
  - [ ] Confirm user is created in Supabase `profiles` table
  - [ ] Verify user can log in immediately after signup

- [ ] **Login Flow**
  - [ ] Navigate to `/auth/login`
  - [ ] Enter valid credentials
  - [ ] Verify successful login and redirect
  - [ ] Check user session is maintained

- [ ] **Password Reset**
  - [ ] Navigate to `/auth/forgot-password`
  - [ ] Enter email address
  - [ ] Verify reset email is sent (if email configured)
  - [ ] Test password reset flow

### Phase 2: Core Application Functionality

#### 2.1 Image Upload & Storage
- [ ] **File Upload**
  - [ ] Navigate to `/image-upload`
  - [ ] Upload various image formats (PNG, JPG, WebP)
  - [ ] Test file size limits
  - [ ] Verify files are stored in Supabase Storage
  - [ ] Check file URLs are accessible

- [ ] **Storage Bucket Creation**
  - [ ] Verify `images` bucket exists in Supabase Storage
  - [ ] Check bucket permissions
  - [ ] Test bucket creation if missing

#### 2.2 Image Upscaling
- [ ] **Basic Upscaling**
  - [ ] Upload test image
  - [ ] Select "Basic Upscale" option
  - [ ] Verify Deep-Image.ai API call succeeds
  - [ ] Check upscaled image is returned
  - [ ] Verify image quality improvement

- [ ] **Auto Enhance**
  - [ ] Select "Auto Enhance" option
  - [ ] Verify enhancement processing
  - [ ] Check enhanced image quality

- [ ] **Generative Upscaling**
  - [ ] Select "Generative Upscale" option
  - [ ] Verify longer processing time
  - [ ] Check AI-generated improvements
  - [ ] Test polling mechanism for long jobs

#### 2.3 User Dashboard
- [ ] **Dashboard Access**
  - [ ] Navigate to `/dashboard` while logged in
  - [ ] Verify user-specific data is displayed
  - [ ] Check credit balance shows correctly

- [ ] **Image Gallery**
  - [ ] Upload multiple images
  - [ ] Verify images appear in dashboard gallery
  - [ ] Test image deletion
  - [ ] Check image metadata display

- [ ] **Usage Statistics**
  - [ ] Verify credit usage tracking
  - [ ] Check processing history
  - [ ] Test statistics accuracy

### Phase 3: Payment Integration Testing

#### 3.1 Stripe Configuration
- [ ] **Environment Variables**
  ```bash
  # Verify these are set in .env.local
  STRIPE_SECRET_KEY=sk_test_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```

- [ ] **Stripe Dashboard Setup**
  - [ ] Verify test products are created
  - [ ] Check webhook endpoint is configured
  - [ ] Confirm webhook events are being received

#### 3.2 Subscription Plans
- [ ] **Pricing Page**
  - [ ] Navigate to `/pricing`
  - [ ] Verify all plans display correctly
  - [ ] Check pricing information is accurate
  - [ ] Test tab switching between subscription and pay-as-you-go

- [ ] **Free Plan**
  - [ ] Test "Get Started" button
  - [ ] Verify 5 free credits are allocated
  - [ ] Check basic features are accessible

- [ ] **Basic Plan ($9.99/month)**
  - [ ] Click "Subscribe Now"
  - [ ] Complete Stripe checkout with test card: `4242 4242 4242 4242`
  - [ ] Verify subscription is created in Stripe
  - [ ] Check 50 credits are added to user account
  - [ ] Verify subscription status shows as "active"

- [ ] **Starter Plan ($24.99/month)**
  - [ ] Repeat subscription test
  - [ ] Verify 200 credits are allocated
  - [ ] Check premium features are accessible

#### 3.3 Pay-as-You-Go Purchases
- [ ] **10 Credits Package ($4.99)**
  - [ ] Select 10-credit package
  - [ ] Complete payment with test card
  - [ ] Verify credits are added immediately
  - [ ] Check transaction appears in billing history

- [ ] **20 Credits Package ($8.99)**
  - [ ] Test 20-credit purchase
  - [ ] Verify correct amount is charged
  - [ ] Check credits are allocated correctly

- [ ] **50 Credits Package ($19.99)**
  - [ ] Test 50-credit purchase
  - [ ] Verify best value pricing
  - [ ] Check transaction recording

#### 3.4 Payment Error Handling
- [ ] **Declined Card**
  - [ ] Use test card: `4000 0000 0000 0002`
  - [ ] Verify error message is displayed
  - [ ] Check credits are not added for failed payments

- [ ] **Insufficient Funds**
  - [ ] Use test card: `4000 0000 0000 9995`
  - [ ] Verify appropriate error handling

- [ ] **Expired Card**
  - [ ] Use test card: `4000 0000 0000 0069`
  - [ ] Check expiration error handling

#### 3.5 Webhook Testing
- [ ] **Subscription Events**
  - [ ] Monitor webhook logs during subscription creation
  - [ ] Verify `customer.subscription.created` event
  - [ ] Check user subscription data is updated in database

- [ ] **Payment Events**
  - [ ] Monitor webhook logs during pay-as-you-go purchases
  - [ ] Verify `payment_intent.succeeded` event
  - [ ] Check credits are added to user account

- [ ] **Subscription Cancellation**
  - [ ] Cancel subscription in billing management
  - [ ] Verify `customer.subscription.deleted` event
  - [ ] Check subscription status updates correctly

#### 3.6 Billing Management
- [ ] **Billing History**
  - [ ] Navigate to billing management section
  - [ ] Verify all transactions appear in history
  - [ ] Check invoice links work correctly
  - [ ] Verify amounts and dates are displayed correctly

- [ ] **Subscription Management**
  - [ ] View current subscription details
  - [ ] Test "Update Payment Method" functionality
  - [ ] Test "Cancel Subscription" functionality
  - [ ] Verify subscription status updates correctly

### Phase 4: Integration Testing

#### 4.1 End-to-End User Journey
- [ ] **Complete New User Flow**
  1. Sign up for new account
  2. Verify email confirmation (if enabled)
  3. Log in to dashboard
  4. Upload test image
  5. Process image with upscaling
  6. View result in dashboard
  7. Purchase credits (pay-as-you-go)
  8. Process additional images
  9. View billing history

- [ ] **Subscription User Flow**
  1. Sign up for new account
  2. Subscribe to Basic Plan
  3. Process multiple images
  4. Check credit usage
  5. View subscription details
  6. Cancel subscription
  7. Verify access continues until billing period ends

#### 4.2 Error Scenarios
- [ ] **Network Failures**
  - [ ] Simulate network interruption during payment
  - [ ] Test image upload with poor connection
  - [ ] Verify graceful error handling

- [ ] **API Failures**
  - [ ] Test with invalid Deep-Image.ai API key
  - [ ] Simulate Stripe API downtime
  - [ ] Check error messages are user-friendly

- [ ] **Storage Issues**
  - [ ] Test with full storage bucket
  - [ ] Verify file upload error handling
  - [ ] Check cleanup of failed uploads

### Phase 5: Performance & Security Testing

#### 5.1 Performance
- [ ] **Image Processing**
  - [ ] Test with large image files (>10MB)
  - [ ] Verify timeout handling for long processes
  - [ ] Check memory usage during processing

- [ ] **Concurrent Users**
  - [ ] Test multiple users processing images simultaneously
  - [ ] Verify no resource conflicts
  - [ ] Check database performance under load

#### 5.2 Security
- [ ] **Authentication**
  - [ ] Test session timeout
  - [ ] Verify logout functionality
  - [ ] Check unauthorized access prevention

- [ ] **Data Protection**
  - [ ] Verify user data isolation
  - [ ] Test file access permissions
  - [ ] Check sensitive data is not exposed in logs

### Phase 6: Browser & Device Testing

#### 6.1 Browser Compatibility
- [ ] **Chrome/Chromium**
- [ ] **Firefox**
- [ ] **Safari**
- [ ] **Edge**

#### 6.2 Device Testing
- [ ] **Desktop** (1920x1080, 1366x768)
- [ ] **Tablet** (768x1024)
- [ ] **Mobile** (375x667, 414x896)

### Phase 7: Production Readiness

#### 7.1 Environment Variables
- [ ] **Production Configuration**
  ```bash
  # Verify all required variables are set
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  DEEP_IMAGE_API_KEY
  ```

#### 7.2 Monitoring Setup
- [ ] **Error Tracking**
  - [ ] Configure error monitoring (Sentry, etc.)
  - [ ] Set up alerting for critical errors
  - [ ] Test error reporting

- [ ] **Analytics**
  - [ ] Set up user analytics
  - [ ] Configure conversion tracking
  - [ ] Test event tracking

## 🚀 Testing Execution Order

### Priority 1 (Critical - Must Fix First)
1. Fix Supabase RLS policy issue
2. Test user signup/login
3. Verify basic image upload

### Priority 2 (Core Functionality)
1. Test image upscaling
2. Verify user dashboard
3. Test basic payment flow

### Priority 3 (Advanced Features)
1. Test all payment scenarios
2. Verify webhook handling
3. Test error conditions

### Priority 4 (Polish)
1. Performance testing
2. Browser compatibility
3. Mobile responsiveness

## 📊 Success Criteria

### Functional Requirements
- [ ] Users can successfully create accounts
- [ ] Image upload and processing works reliably
- [ ] Payment processing is secure and accurate
- [ ] Webhooks properly update user data
- [ ] Error handling is graceful and informative

### Non-Functional Requirements
- [ ] Page load times under 3 seconds
- [ ] Image processing completes within 60 seconds
- [ ] Payment flows complete within 30 seconds
- [ ] 99% uptime for critical functions
- [ ] No sensitive data exposure

## 🔧 Test Data

### Test Users
```json
{
  "email": "test@example.com",
  "password": "TestPassword123!",
  "full_name": "Test User"
}
```

### Test Images
- Small PNG (100KB)
- Large JPG (5MB)
- WebP format
- Various aspect ratios

### Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Insufficient: `4000 0000 0000 9995`
- Expired: `4000 0000 0000 0069`

## 📝 Bug Reporting Template

When issues are found, document with:
1. **Issue Description**: Clear explanation of the problem
2. **Steps to Reproduce**: Exact steps to trigger the issue
3. **Expected vs Actual**: What should happen vs what does happen
4. **Environment**: Browser, OS, user state
5. **Screenshots/Logs**: Visual evidence and error logs
6. **Severity**: Critical/High/Medium/Low
7. **Priority**: P0/P1/P2/P3

---

**Next Steps**: Start with Phase 1 to fix the critical user signup issue, then proceed systematically through each phase. 