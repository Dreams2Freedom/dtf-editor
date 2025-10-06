# Credit Deduction Testing Guide

## Before Testing - IMPORTANT!

You need to create the missing database functions first. Run this SQL in your Supabase SQL editor:

```sql
-- Create credit deduction function with expiration tracking
CREATE OR REPLACE FUNCTION use_credits_with_expiration(
    p_user_id UUID,
    p_credits_to_use INTEGER,
    p_operation TEXT
)
RETURNS TABLE(success BOOLEAN, remaining_credits INTEGER) AS $$
DECLARE
    v_current_credits INTEGER;
    v_new_credits INTEGER;
BEGIN
    -- Get current credits
    SELECT credits_remaining INTO v_current_credits
    FROM profiles
    WHERE id = p_user_id;

    -- Check if enough credits
    IF v_current_credits < p_credits_to_use THEN
        RETURN QUERY SELECT false, v_current_credits;
        RETURN;
    END IF;

    -- Deduct credits
    v_new_credits := v_current_credits - p_credits_to_use;

    UPDATE profiles
    SET credits_remaining = v_new_credits,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Log the transaction
    INSERT INTO credit_transactions (
        user_id,
        amount,
        type,
        description,
        metadata,
        balance_after
    ) VALUES (
        p_user_id,
        -p_credits_to_use,
        'usage',
        'Used for ' || p_operation,
        jsonb_build_object('operation', p_operation),
        v_new_credits
    );

    RETURN QUERY SELECT true, v_new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create credit transaction function for refunds
CREATE OR REPLACE FUNCTION add_credit_transaction(
    p_user_id UUID,
    p_amount INTEGER,
    p_type VARCHAR(50),
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
DECLARE
    v_current_credits INTEGER;
    v_new_credits INTEGER;
BEGIN
    -- Get current credits
    SELECT credits_remaining INTO v_current_credits
    FROM profiles
    WHERE id = p_user_id;

    -- Calculate new credits
    v_new_credits := v_current_credits + p_amount;

    -- Update profile
    UPDATE profiles
    SET credits_remaining = v_new_credits,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Log the transaction
    INSERT INTO credit_transactions (
        user_id,
        amount,
        type,
        description,
        metadata,
        balance_after
    ) VALUES (
        p_user_id,
        p_amount,
        p_type,
        p_description,
        p_metadata,
        v_new_credits
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION use_credits_with_expiration TO authenticated;
GRANT EXECUTE ON FUNCTION add_credit_transaction TO authenticated;
```

## Test 1: Upscale Image (1 credit)

1. **Check starting credits**
   - Go to dashboard: http://localhost:3000/dashboard
   - Note your credit balance (e.g., "Credits: 547")

2. **Process an image**
   - Click "Process Image" or go to http://localhost:3000/process
   - Upload any JPEG/PNG image
   - Click "Upscale Image"
   - Choose scale (2x, 3x, or 4x)
   - Click "Upscale Image (2x)"

3. **Verify credit deduction**
   - Wait for processing to complete
   - Go back to dashboard
   - Credits should be reduced by 1 (e.g., from 547 to 546)

4. **Check transaction log**
   ```sql
   SELECT * FROM credit_transactions
   WHERE user_id = '[your-user-id]'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

## Test 2: Background Removal (1 credit)

1. **Note current credits** from dashboard

2. **Process an image**
   - Go to http://localhost:3000/process
   - Upload an image
   - Click "Remove Background"
   - Wait for processing

3. **Verify**
   - Dashboard shows 1 credit deducted
   - Processed image has transparent background

## Test 3: Vectorization (2 credits)

1. **Note current credits** from dashboard

2. **Process an image**
   - Go to http://localhost:3000/process
   - Upload an image
   - Click "Vectorize"
   - Wait for processing

3. **Verify**
   - Dashboard shows 2 credits deducted
   - You receive an SVG file

## Test 4: Insufficient Credits

1. **Ensure low credits**
   - If you have many credits, you'll need to use them up
   - Or update your profile directly:

   ```sql
   UPDATE profiles
   SET credits_remaining = 0
   WHERE id = '[your-user-id]';
   ```

2. **Try to process**
   - Upload an image
   - Try any operation
   - Should see error: "Insufficient credits. Please purchase more credits."

3. **Restore credits**
   - Buy credits through pricing page
   - Or manually add for testing

## Test 5: Credit Refund on Failure

1. **Break an API temporarily**
   - Edit `.env.local`
   - Change `DEEP_IMAGE_API_KEY` to `invalid_key`
   - Restart dev server

2. **Try upscaling**
   - Note starting credits
   - Upload and try to upscale
   - Should fail with error

3. **Verify refund**
   - Check dashboard - credits should be same as before
   - Check transactions for refund entry

4. **Restore API key**
   - Fix the API key in `.env.local`
   - Restart server

## Troubleshooting

### "Function does not exist" Error

- Make sure you ran the SQL script above in Supabase SQL editor
- Check that functions were created:
  ```sql
  SELECT proname FROM pg_proc WHERE proname LIKE '%credit%';
  ```

### Credits Not Updating

- Check browser console for errors
- Verify user is authenticated
- Check Supabase logs for RLS policy errors

### Processing Fails Immediately

- Verify API keys are correct
- Check you have sufficient credits
- Look at network tab for detailed error

## Success Criteria ✅

- [ ] Upscaling deducts 1 credit
- [ ] Background removal deducts 1 credit
- [ ] Vectorization deducts 2 credits
- [ ] Insufficient credits blocks processing
- [ ] Failed processing refunds credits
- [ ] All transactions logged in database
- [ ] Dashboard updates in real-time
