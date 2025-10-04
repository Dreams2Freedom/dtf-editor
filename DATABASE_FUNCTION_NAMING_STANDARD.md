# Database Function Naming Standard

## 🚨 CRITICAL: Read Before Creating Any PostgreSQL Function

This document defines the **mandatory naming conventions** for all PostgreSQL functions to prevent parameter mismatch errors.

---

## The Problem We Had

**October 4, 2025:** Spent hours debugging 404 errors on admin functions, only to discover:
- Functions existed in database with parameter `check_user_id`
- Client code called them with parameter `user_id`
- PostgreSQL treated these as **completely different functions** → 404 errors

**Time wasted:** 2+ hours debugging what should have been caught by following a naming standard.

---

## Mandatory Naming Standards

### 1. User Identification Parameters

**ALWAYS use `user_id` (NOT `check_user_id`, `userId`, or any variation)**

✅ **CORRECT:**
```sql
CREATE FUNCTION is_admin(user_id UUID)
CREATE FUNCTION get_admin_role(user_id UUID)
CREATE FUNCTION has_permission(user_id UUID, permission_key TEXT)
```

❌ **WRONG:**
```sql
CREATE FUNCTION is_admin(check_user_id UUID)  -- NO!
CREATE FUNCTION is_admin(userId UUID)         -- NO!
CREATE FUNCTION is_admin(uid UUID)            -- NO!
```

### 2. Other Common Parameters

| Parameter Type | Standard Name | Examples |
|---------------|---------------|----------|
| User ID | `user_id` | `user_id UUID` |
| Permission | `permission_key` | `permission_key TEXT` |
| Email | `user_email` | `user_email TEXT` |
| Role | `role_name` | `role_name TEXT` |
| Timestamp | Use descriptive name | `created_after TIMESTAMP`, `valid_until TIMESTAMP` |

### 3. Function Naming Convention

**Pattern:** `verb_noun` or `is_adjective` or `get_noun`

✅ **CORRECT:**
```sql
is_admin(user_id UUID)           -- Check boolean status
is_super_admin(user_id UUID)     -- Check boolean status
get_admin_role(user_id UUID)     -- Retrieve value
has_permission(user_id UUID, permission_key TEXT)  -- Check boolean
create_admin_user(...)           -- Action function
update_user_credits(...)         -- Action function
```

❌ **WRONG:**
```sql
admin(user_id UUID)              -- Vague, unclear what it does
checkAdmin(user_id UUID)         -- camelCase (use snake_case)
AdminCheck(user_id UUID)         -- PascalCase (use snake_case)
```

### 4. Return Type Clarity

**Always use explicit return types**

✅ **CORRECT:**
```sql
CREATE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
```

✅ **CORRECT:**
```sql
CREATE FUNCTION get_admin_role(user_id UUID)
RETURNS TEXT AS $$
```

❌ **WRONG:**
```sql
CREATE FUNCTION is_admin(user_id UUID)
-- Missing RETURNS clause
```

---

## Before Creating Any Function: Checklist

- [ ] Check if similar functions exist - use the same parameter names
- [ ] Verify what parameter names the client code expects
- [ ] Use `user_id` for user identification (not `check_user_id`)
- [ ] Use snake_case for function names
- [ ] Use descriptive verb_noun or is_adjective pattern
- [ ] Specify explicit return type
- [ ] Add SECURITY DEFINER if function needs elevated privileges
- [ ] Add comments explaining what the function does

---

## How to Verify Parameter Names

### Step 1: Check Existing Functions
```bash
grep -r "CREATE FUNCTION function_name" supabase/migrations/
```

### Step 2: Check Client Code Usage
```bash
grep -r "supabase.rpc('function_name'" src/
```

### Step 3: Verify They Match
```typescript
// Client code
const { data } = await supabase.rpc('get_admin_role', {
  user_id: userId  // ← This parameter name
});
```

```sql
-- Database function MUST match
CREATE FUNCTION get_admin_role(
  user_id UUID  -- ← Must be exactly the same
)
```

---

## Standard Template

When creating new admin-related functions, use this template:

```sql
-- [Brief description of what this function does]
CREATE OR REPLACE FUNCTION function_name(
  user_id UUID,              -- User to check/modify
  other_param TEXT           -- Other parameters as needed
)
RETURNS BOOLEAN AS $$        -- Or TEXT, UUID, JSONB, etc.
DECLARE
  -- Declare variables if needed
  result_var BOOLEAN;
BEGIN
  -- Function logic here

  RETURN result_var;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the function
COMMENT ON FUNCTION function_name IS 'Brief description of what this function does and when to use it';
```

---

## Common Functions Reference

**These are the standard admin functions - always use these parameter names:**

```sql
-- Check if user is admin (any level)
is_admin(user_id UUID) RETURNS BOOLEAN

-- Check if user is super admin
is_super_admin(user_id UUID) RETURNS BOOLEAN

-- Get user's admin role
get_admin_role(user_id UUID) RETURNS TEXT

-- Check specific permission
has_permission(user_id UUID, permission_key TEXT) RETURNS BOOLEAN
```

---

## Why This Matters

PostgreSQL function signatures include parameter names. If you have:
- `is_admin(check_user_id UUID)` in database
- `supabase.rpc('is_admin', { user_id: '...' })` in client code

PostgreSQL sees these as **different functions** and returns 404.

**The error won't be obvious** - you'll just get "function not found" even though the function exists.

---

## Enforcement

1. **Before committing any SQL migration:**
   - Verify parameter names match client code
   - Check against this standard
   - Search codebase for existing similar functions

2. **During code review:**
   - Verify all PostgreSQL functions follow this standard
   - Check that client code uses correct parameter names

3. **When debugging "function not found" errors:**
   - **FIRST** check parameter names match
   - Don't assume the function doesn't exist
   - Don't spend hours debugging - check parameter names first!

---

## Related Documentation

- `CRITICAL_LESSON_LEARNED.md` - The 6-hour mistake that led to this standard
- `ADMIN_CREDENTIALS.md` - Admin system overview
- `supabase/migrations/20250103_create_admin_roles_system.sql` - Reference implementation

---

**Remember:** Consistency in naming prevents bugs. Always use `user_id` for user identification parameters.
