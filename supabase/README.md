# DTF Editor - Database Setup

This directory contains all database-related files for the DTF Editor application.

## 📁 Directory Structure

```
supabase/
├── migrations/           # Database migration files
│   ├── 001_initial_schema.sql
│   └── 002_analytics_views.sql
├── config.toml          # Supabase configuration
└── README.md           # This file
```

## 🚀 Quick Start

### 1. Set Up Environment Variables

Copy the example environment file and fill in your Supabase credentials:

```bash
cp env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 2. Run Database Setup

```bash
npm run db:setup
```

This script will:
- Check your environment variables
- Test the database connection
- Verify migration files
- Generate TypeScript types

### 3. Apply Migrations

#### Option A: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration files in order:
   - `001_initial_schema.sql`
   - `002_analytics_views.sql`

#### Option B: Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

## 📊 Database Schema Overview

### Core Tables

#### `profiles`
- Extends Supabase Auth users
- Stores user profile information
- Manages subscription status and credits

#### `images`
- Stores image metadata and processing status
- Links to Supabase Storage for file URLs
- Tracks processing history and downloads

#### `image_operations`
- Records each AI processing operation
- Tracks API costs and processing times
- Links to specific images and users

#### `credit_transactions`
- Manages credit purchases and usage
- Tracks payment information
- Handles credit expiration

#### `subscription_plans` & `pay_as_you_go_packages`
- Defines available plans and packages
- Links to Stripe price IDs
- Stores feature configurations

### Analytics Views

#### `user_analytics`
- User statistics and usage metrics
- Image processing success rates
- Credit usage patterns

#### `revenue_analytics`
- Monthly revenue tracking
- Transaction counts and values
- Payment success rates

#### `api_usage_analytics`
- API provider performance metrics
- Response times and error rates
- Cost tracking by operation

## 🔐 Security Features

### Row Level Security (RLS)
All user data is protected with RLS policies:

- Users can only access their own data
- Admins have access to all data
- System operations are properly secured

### Key Policies
- `profiles`: Users can view/update own profile
- `images`: Users can manage own images
- `credit_transactions`: Users can view own transactions
- `api_usage_logs`: System can insert, users can view own

## 🛠️ Database Functions

### Credit Management
- `add_user_credits()`: Add credits to user account
- `deduct_user_credits()`: Deduct credits with validation
- `get_user_statistics()`: Get user usage statistics

### Analytics
- `get_revenue_statistics()`: Calculate revenue for date range
- `update_updated_at_column()`: Auto-update timestamps

## 📈 Performance Optimizations

### Indexes
- User-specific queries are indexed
- Date-based analytics queries optimized
- Composite indexes for common patterns

### Autovacuum Settings
- Optimized for high-traffic tables
- Prevents bloat and maintains performance

## 🔄 Real-time Features

The following tables support real-time subscriptions:
- `images`: Live processing status updates
- `image_operations`: Real-time operation progress
- `credit_transactions`: Live credit balance updates

## 🧪 Testing

### Test Database Connection
```bash
npm run db:setup
```

### Test Credit Functions
```sql
-- Test adding credits
SELECT add_user_credits('user-uuid', 10, 'bonus', 'Welcome bonus');

-- Test deducting credits
SELECT deduct_user_credits('user-uuid', 1, 'usage', 'Image upscaling');
```

### Test Analytics Views
```sql
-- View user analytics
SELECT * FROM user_analytics WHERE id = 'user-uuid';

-- View revenue analytics
SELECT * FROM revenue_analytics ORDER BY month DESC LIMIT 12;
```

## 🚨 Troubleshooting

### Common Issues

#### "Table does not exist"
- Ensure migrations have been applied
- Check migration order (001 before 002)
- Verify Supabase project connection

#### "Permission denied"
- Check RLS policies are enabled
- Verify user authentication
- Ensure proper role permissions

#### "Connection failed"
- Verify environment variables
- Check Supabase project status
- Ensure network connectivity

### Debug Commands

```bash
# Check environment variables
npm run db:setup

# Test specific connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('profiles').select('count').then(console.log).catch(console.error);
"
```

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)

## 🔄 Migration Management

### Creating New Migrations
1. Create new SQL file in `migrations/` directory
2. Use timestamp prefix: `003_feature_name.sql`
3. Test locally before applying to production
4. Document changes in migration file

### Rollback Strategy
- Always backup before major changes
- Test migrations on staging environment
- Use Supabase CLI for version control
- Keep migration files in version control

---

**Need Help?** Check the main [README.md](../README.md) or create an issue in the repository. 