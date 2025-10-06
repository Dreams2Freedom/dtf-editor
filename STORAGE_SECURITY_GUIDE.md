# Storage Security Guide

## Overview

DTF Editor uses Supabase Storage for managing user-uploaded and processed images. This guide documents the security policies and verification procedures.

## Storage Buckets

### 1. `images` (Public Bucket)

- **Purpose**: Stores processed images after AI operations
- **Access**: Public bucket, but with RLS policies to restrict access
- **Path Structure**: `{user_id}/{filename}`
- **Security**: Users can only access files in their own user folder

### 2. `user-images` (Private Bucket)

- **Purpose**: Temporary storage for image processing
- **Access**: Private bucket, authenticated users only
- **Path Structure**: `{user_id}/{filename}`
- **Security**: Strict user isolation

### 3. `user-uploads` (Public Bucket)

- **Purpose**: Initial uploads before processing
- **Access**: Public bucket with RLS policies
- **Path Structure**: `{user_id}/{filename}`
- **Security**: Users can only manage their own uploads

## Security Issues Found

### 🚨 Critical Issue: User File Access

During verification, we found that users can access other users' files in the public `images` bucket. This needs to be fixed by applying proper RLS policies.

## How to Fix Storage Policies

### Step 1: Apply RLS Policies via Supabase Dashboard

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `scripts/fix-storage-policies.sql`
5. Click **Run** to execute

### Step 2: Verify Policies

Run the verification script to ensure policies are working:

```bash
node scripts/verify-storage-policies.js
```

Expected output:

- ✅ User isolation working: User 2 cannot access User 1's files
- ✅ Anonymous users cannot read processed_images

## Storage Best Practices

### 1. File Organization

```
images/
├── {user_id}/
│   ├── public/        # Publicly shareable images
│   └── private/       # User's private images
```

### 2. URL Generation

```javascript
// For private images - use signed URLs
const { data: signedUrl } = await supabase.storage
  .from('images')
  .createSignedUrl(`${userId}/${filename}`, 3600); // 1 hour expiry

// For public shareable images
const publicUrl = supabase.storage
  .from('images')
  .getPublicUrl(`${userId}/public/${filename}`).data.publicUrl;
```

### 3. Upload Security

Always prefix uploads with the authenticated user's ID:

```javascript
const filePath = `${user.id}/${filename}`;
const { error } = await supabase.storage.from('images').upload(filePath, file);
```

## Verification Scripts

### 1. `verify-storage-policies.js`

- Tests bucket access controls
- Verifies user isolation
- Checks RLS policies on database tables
- Creates temporary test users for thorough testing

### 2. `apply-storage-policies.js`

- Shows current bucket configuration
- Provides SQL to fix policies
- Instructions for manual application

## Database RLS Policies

The `processed_images` table also has RLS policies:

- Users can only see their own images
- Anonymous users have no access
- Service role bypasses RLS for admin operations

## Regular Security Audits

Run these checks regularly:

1. **Monthly**: Run `verify-storage-policies.js`
2. **After Updates**: Re-verify after Supabase updates
3. **User Reports**: Investigate any access issues immediately

## Emergency Response

If unauthorized access is detected:

1. **Immediate**: Disable public access on affected buckets
2. **Investigate**: Check access logs in Supabase Dashboard
3. **Fix**: Apply stricter RLS policies
4. **Notify**: Inform affected users if data was exposed

## Contact

For security concerns, contact: security@dtfeditor.com
