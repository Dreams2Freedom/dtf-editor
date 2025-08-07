# DTF Editor - Development Log (Part 1)

**Purpose:** Track development progress, decisions, challenges, and solutions  
**Format:** Newest entries at top

---

## 📅 August 2025 - Production Bug Fixes

### **Date: 2025-08-06 - Stripe Webhook Integration & Notification System**

#### **Task: Fix Stripe Payment Processing & Add Admin Notification System**

**Duration:** 4 hours

**What Was Accomplished:**
1. **Fixed Stripe Webhook Integration Issues**
   - Webhook signature verification failing (400 errors)
   - Webhook URL pointing to preview deployment instead of production
   - Runtime errors: `Cannot read properties of null` and `Invalid time value`
   - Subscription cancellations from Stripe dashboard not updating user status

2. **Built Complete Notification System**
   - Admin can send targeted notifications to users
   - Support for targeting by subscription plan (all, free, basic, starter)
   - Notification types: info, success, warning, error, announcement
   - Read/dismiss functionality with unread count badge
   - Optional action URLs and expiration dates
   - Real-time notification bell in user header

**Problems Solved:**

1. **Webhook Not Receiving Events:**
   - Root cause: Webhook URL was `dtfeditor.vercel.app` instead of `dtfeditor.com`
   - Fixed by updating webhook URL in Stripe dashboard

2. **Webhook Signature Verification Failed:**
   - Root cause: Test mode vs Live mode confusion
   - Each mode has different signing secrets
   - Fixed by using test mode secret to match test API keys

3. **Webhook Runtime Errors:**
   - `supabase` variable was null - fixed by using `getSupabase()` consistently
   - Date conversion errors - added null checks for subscription date fields

4. **Subscription Updates Not Reflecting:**
   - Stripe dashboard actions don't include userId in metadata
   - Fixed by looking up user by Stripe customer ID as fallback

**Technical Implementation:**

1. **Database Migration (`011_create_notifications_system.sql`):**
   - `notifications` table for storing notifications
   - `user_notifications` junction table for read/dismissed status
   - RLS policies for secure access
   - Functions for marking read, dismissing, and sending to audiences

2. **API Endpoints:**
   - `/api/admin/notifications/send` - Admin endpoint to create notifications
   - `/api/notifications` - User endpoints to fetch and update status

3. **UI Components:**
   - `NotificationBell` component with dropdown panel
   - Admin notification sender at `/admin/notifications`
   - Integration with existing header

**Manual Fixes Applied:**
- Created scripts for manual subscription management:
  - `fix-subscription-manually.js` - Update subscription status
  - `cancel-subscription-manual.js` - Cancel subscriptions
  - `update-user-credits.js` - Adjust user credits
  - `reset-stripe-customer.js` - Clear Stripe data for fresh start
  - `resubscribe-user.js` - Manually activate subscriptions

**Key Learnings:**
- Stripe test mode and live mode are completely separate environments
- Webhook secrets must match the mode of your API keys
- Always implement fallbacks for webhook data (customer ID lookup)
- Build errors can be misleading - check imports carefully
- Manual intervention scripts are valuable for production issues

**User Management Updates:**
- Added 100 credits to tami@s2transfers.com
- Made shannon@s2transfers.com a super admin
- Reset password for shannon@s2transfers.com

---

### **Date: 2025-08-05 - ClippingMagic Upload Fix for Next.js Body Parser Limit**

#### **Task: Fix 413 Error for Background Removal Upload**

**Duration:** 30 minutes

**What Was Fixed:**
- Background removal failing with 413 "Payload Too Large" for files over 4MB
- Previous 50MB fix only updated application validation, not platform limits
- Added maxBodySize configuration to vercel.json for all upload routes

**Problem:**
- User uploading 4.46MB file for background removal
- Getting 413 errors and "Unexpected token 'R', 'Request En'... is not valid JSON"
- File well under the 50MB limit we previously set

**Root Cause Analysis:**
- Next.js App Router has a default 4MB body parser limit
- This is separate from Vercel's deployment size limits
- Must be configured per API route in vercel.json
- Error message was truncated "Request Entity Too Large" being parsed as JSON

**Solution Applied:**
- Added `maxBodySize: "50mb"` configuration to vercel.json for:
  - `/api/upload/route.ts`
  - `/api/process/route.ts`
  - `/api/upscale/route.ts`
  - `/api/clippingmagic/upload/route.ts`

**Lessons Learned:**
- Next.js body parser limits are separate from Vercel deployment limits
- Platform-level configurations must be set in vercel.json
- Always check both application and platform limits when debugging upload issues
- Error messages can be misleading when platform rejects request before app code runs

---

### **Date: 2025-08-05 - File Size Limit Fix for Vercel Pro**

#### **Task: Fix 413 Payload Too Large Errors After Vercel Pro Upgrade**

**Duration:** 30 minutes

**What Was Fixed:**
- Updated all hard-coded 10MB file size limits to 50MB throughout the codebase
- Found and fixed limits in 5 different files that were preventing large file uploads

**Problem:**
- User upgraded to Vercel Pro specifically to handle larger files (up to 50MB)
- Still getting "413 Payload Too Large" errors when uploading files over 10MB
- Error persisted even after redeployment

**Root Cause Analysis:**
- Multiple components had hard-coded 10MB limits (10 * 1024 * 1024)
- These client-side and server-side validations were rejecting files before they reached Vercel
- Limits were scattered across the codebase without centralized configuration

**Files Updated:**
1. `/src/services/storage.ts` - Line 21: Changed from 10MB to 50MB
2. `/src/app/api/process/route.ts` - Line 33: Changed MAX_FILE_SIZE to 50MB
3. `/src/app/process/client.tsx` - Line 34: Updated maxSize to 50MB
4. `/src/components/image/ImageProcessor.tsx` - Line 156: Updated maxSize to 50MB
5. `/src/components/image/ImageUpload.tsx` - Line 35: Changed DEFAULT_MAX_FILE_SIZE to 50MB

**Technical Details:**
- Vercel Hobby plan: 4.5MB body size limit
- Vercel Pro plan: 50MB body size limit
- No vercel.json configuration needed for Pro limits (automatic)

**Vercel Pro Plan - Complete Image Optimization Details:**
- **Source Images**: 5,000 images (vs 1,000 on Hobby)
- **Fast Data Transfer**: 1 TB (vs 100 GB on Hobby)
- **Image Optimization Formats**: JPEG, PNG, WebP, AVIF (other formats served as-is)
- **Maximum Image Dimensions**: 8192x8192 pixels
- **Additional Images**: Can pay for images beyond 5,000 limit
- **Fair Usage**: Monthly usage guidelines apply, excess may incur charges

**Lessons Learned:**
- File size limits should be centralized in configuration
- When platform limits change, search entire codebase for hard-coded values
- Client-side validation must match server-side limits
- Consider image optimization limits when designing features (5,000 source images)
- Monitor data transfer usage to stay within 1 TB limit

---

### **Date: 2025-08-05 - Critical Production Issues Fixed**

#### **Task: Fix Authentication, Image Gallery, and Vectorization Save Issues**

**Duration:** 2.5 hours

**What Was Fixed:**

1. **Authentication Issues**
   - Fixed "Invalid login credentials" error
   - Added missing redirect URLs to Supabase configuration
   - Implemented missing `getAuthState()` method in AuthService
   - Reset user passwords to enable access

2. **Dashboard 403 Errors**
   - Discovered duplicate RLS policies for both {public} and {authenticated} roles
   - Created SQL script to clean up duplicate policies
   - Updated components to use RPC functions instead of direct table access
   - Fixed database trigger calling non-existent `calculate_image_expiration` function

3. **Image Gallery Display Issues**
   - **Problem**: Images saved with 0 bytes and broken links
   - **Root Cause**: Deep-Image API returns temporary URLs that expire quickly
   - **Solution**: 
     - Modified Deep-Image service to download images immediately after processing
     - Convert to base64 data URLs to preserve image data
     - Handle data URLs in saveProcessedImage function
     - Implement signed URL generation (1-hour expiry) for private storage

4. **Vectorization Save Failure**
   - **Problem**: Vectorized images never saved (0 records in database)
   - **Root Cause**: Database constraint only allowed 'upscale' and 'background-removal'
   - **Solution**: Updated constraint to include 'vectorization' as valid operation_type
   - **SQL Applied**: 
     ```sql
     ALTER TABLE processed_images 
     ADD CONSTRAINT processed_images_operation_type_check 
     CHECK (operation_type IN ('upscale', 'background-removal', 'vectorization'));
     ```

**Technical Implementation Details:**

1. **Deep-Image URL Handling**:
   - URLs format: `https://deep-image.ai/api/downloadTemporary/{id}/{filename}`
   - Implemented immediate download in `deepImage.ts` service
   - Convert ArrayBuffer to base64 data URL for preservation
   - Return data URL instead of temporary URL

2. **Storage Architecture Decision**:
   - Kept storage bucket private for security (per previous decision in line 506)
   - Generate signed URLs on demand instead of storing them
   - Store only the storage path in database
   - Generate fresh signed URLs in ImageGalleryEnhanced component

3. **SVG File Handling**:
   - Fixed content type handling (image/svg+xml → svg extension)
   - Added proper MIME type support
   - Verified storage bucket accepts all MIME types (allowed_mime_types: null)

**Lessons Learned:**
- External API temporary URLs must be downloaded immediately
- Database constraints must match all possible enum values
- Storing signed URLs is problematic - store paths and generate on demand
- Always check existing RLS policies before adding new ones

**Files Modified:**
- `/src/services/auth.ts` - Added getAuthState() method
- `/src/services/deepImage.ts` - Added immediate download logic
- `/src/utils/saveProcessedImage.ts` - Handle data URLs and generate signed URLs
- `/src/components/image/ImageGalleryEnhanced.tsx` - Generate signed URLs on demand
- `/scripts/fix-operation-type-constraint.sql` - Fix database constraint

**Verification:**
- All three image processing types now save correctly
- Images display properly with correct file sizes
- Vectorization records successfully saved to database
- No more 403 or 404 errors in gallery

---

## ⚠️ IMPORTANT: Continue reading in DEVELOPMENT_LOG_PART2.md

This log file has been split into multiple parts for better readability. Please proceed to:
- **DEVELOPMENT_LOG_PART2.md** - Contains July 2025 entries (Email System, Admin Dashboard, Gallery Implementation)
- **DEVELOPMENT_LOG_PART3.md** - Contains January 2025 and earlier entries (Initial Development, Bug Fixes)

Total parts: 3