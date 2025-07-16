# PostgreSQL Setup Guide for DTF Editor

This guide will help you migrate from SQLite to PostgreSQL for production scalability.

## Why PostgreSQL?

- **Scalability**: Handles thousands of concurrent users
- **ACID Compliance**: Ensures data integrity for financial transactions
- **Performance**: Optimized for complex queries and large datasets
- **Reliability**: Proven in production environments
- **Features**: JSON support, full-text search, advanced indexing

## Setup Options

### Option 1: Local PostgreSQL (Development)

#### Install PostgreSQL on macOS:
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql

# Create database
createdb dtf_editor_dev
```

#### Install PostgreSQL on Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb dtf_editor_dev
```

### Option 2: Supabase (Recommended for Production)

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your connection details from Settings > Database
4. Add to your `.env` file:

```env
DB_HOST=db.your-project.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password
NODE_ENV=production
```

### Option 3: Railway PostgreSQL

1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Add PostgreSQL service
4. Get connection details from Variables tab
5. Add to your `.env` file:

```env
DB_HOST=containers-us-west-XX.railway.app
DB_PORT=XXXXX
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=your-password
NODE_ENV=production
```

## Migration Steps

### 1. Install Dependencies

```bash
npm install pg
```

### 2. Update Environment Variables

Create or update your `.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dtf_editor_dev
DB_USER=postgres
DB_PASSWORD=your-password

# Environment
NODE_ENV=development

# Existing variables
STRIPE_SECRET_KEY=your-stripe-key
VECTORIZER_API_ID=your-vectorizer-id
CLIPPING_MAGIC_API_ID=your-clipping-magic-id
```

### 3. Run Migration

```bash
# Migrate data from SQLite to PostgreSQL
npm run db:migrate
```

### 4. Update Server Configuration

Update your `server.js` to use PostgreSQL:

```javascript
// Replace this line:
const { dbHelpers, initializeDatabase } = require('./database');

// With this:
const { dbHelpers, initializeDatabase } = require('./database-postgres');
```

### 5. Test the Setup

```bash
# Start the server
npm start

# Test the API
curl http://localhost:3000/api/health
```

## Production Deployment

### Environment Variables for Production

```env
NODE_ENV=production
DB_HOST=your-production-host
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-username
DB_PASSWORD=your-secure-password
```

### Performance Optimization

1. **Connection Pooling**: Already configured in `database-postgres.js`
2. **Indexes**: Automatically created for common queries
3. **SSL**: Enabled for production connections
4. **Query Optimization**: Uses parameterized queries

### Monitoring

Add these to your production setup:

```javascript
// Add to your server.js for monitoring
const { Pool } = require('pg');

// Monitor connection pool
setInterval(() => {
    console.log('Database pool status:', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
    });
}, 30000);
```

## Backup Strategy

### Automated Backups

For Supabase:
- Automatic daily backups included
- Point-in-time recovery available

For Railway:
- Automatic backups every 24 hours
- Manual backups available

For self-hosted:
```bash
# Create backup script
#!/bin/bash
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if PostgreSQL is running
   - Verify host and port settings
   - Check firewall settings

2. **Authentication Failed**
   - Verify username and password
   - Check pg_hba.conf for authentication method

3. **SSL Issues**
   - For development: Set `ssl: false`
   - For production: Ensure SSL certificates are valid

### Performance Issues

1. **Slow Queries**
   - Check if indexes are being used: `EXPLAIN ANALYZE`
   - Monitor query performance with logging

2. **Connection Pool Exhaustion**
   - Increase `max` connections in pool config
   - Check for connection leaks

## Next Steps

1. **Set up monitoring**: Add query performance monitoring
2. **Implement caching**: Add Redis for session storage
3. **Add read replicas**: For high-traffic scenarios
4. **Set up automated backups**: Configure backup schedules
5. **Performance tuning**: Optimize queries and indexes

## Support

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Supabase Documentation: https://supabase.com/docs
- Railway Documentation: https://docs.railway.app 