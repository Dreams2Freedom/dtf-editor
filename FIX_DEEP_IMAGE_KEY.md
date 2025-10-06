# Fix Deep-Image API Key

The error "No user found for provided token" is occurring because the Deep-Image API key in your `.env.local` file is set to a test/invalid key:

```
DEEP_IMAGE_API_KEY=73e72360-67b3-11f0-aac1-2d32901b6ec4-invalid_key_for_testing
```

## How to Fix

1. **Get your real Deep-Image API key:**
   - Go to https://deep-image.ai/
   - Log in to your account
   - Navigate to API settings
   - Copy your actual API key

2. **Update your `.env.local` file:**

   ```bash
   DEEP_IMAGE_API_KEY=your-actual-api-key-here
   ```

3. **Restart your development server:**
   ```bash
   npm run dev
   ```

## Temporary Workaround

If you don't have a Deep-Image API key yet, you can:

1. Sign up for a free account at https://deep-image.ai/
2. Or temporarily comment out the upscaling feature

## What I Fixed

I've already fixed the credit synchronization issues:

- Updated `imageProcessing.ts` to check both `credits` and `credits_remaining` columns
- Updated `authStore.ts` to handle both column names
- Updated `CreditDisplay.tsx` to show correct credit balance

Once you update the API key, the upscaling feature should work correctly.
