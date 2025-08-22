# GoHighLevel API Setup Guide

## Current Status
- **API Key Found:** ✅ (but showing "Invalid JWT" error)
- **Location ID Found:** ✅ ujyAnjez4JM3ZHmFfAg2
- **Connection Status:** ❌ 401 Unauthorized - Invalid JWT

## The Issue
The API key you've added appears to be invalid or expired. GoHighLevel API keys are JWT tokens that can expire or become invalid.

## How to Get a Valid API Key

### Option 1: From GoHighLevel Agency Dashboard
1. Log into your GoHighLevel agency account
2. Go to **Settings** → **API Keys** (or **Business Profile** → **API Keys**)
3. Click **Create API Key** or **Generate New Key**
4. Give it a name like "DTF Editor Integration"
5. Select the appropriate permissions (Contacts, Locations, etc.)
6. Copy the generated API key

### Option 2: From Location/Sub-account Settings
1. Log into the specific location/sub-account
2. Go to **Settings** → **Integrations** → **API Keys**
3. Generate a new API key for this location
4. Copy the key

### Option 3: Using OAuth (Marketplace App)
If you're building a marketplace app:
1. Go to the GoHighLevel Marketplace
2. Create a new app
3. Use OAuth flow to get access tokens

## Required Permissions
The API key needs at least these permissions:
- **Contacts:** Read, Write, Delete
- **Locations:** Read
- **Custom Fields:** Read
- **Tags:** Read, Write

## Environment Variables
Add these to your `.env.local` or `.env.production`:

```bash
# GoHighLevel API Configuration
GOHIGHLEVEL_API_KEY=your_new_api_key_here
GOHIGHLEVEL_LOCATION_ID=ujyAnjez4JM3ZHmFfAg2
```

## Testing the Connection
Once you have a new API key, test it with:

```bash
node scripts/test-highlevel.js
```

## Common Issues

### "Invalid JWT" Error
- The API key has expired
- The API key was revoked
- The API key format is incorrect
- You're using a location-specific key with the wrong location ID

### "Unauthorized" Error
- Missing required permissions
- API key doesn't have access to the specified location
- Using agency-level key when location-level is needed (or vice versa)

## Next Steps
1. Generate a new API key from GoHighLevel
2. Update the GOHIGHLEVEL_API_KEY in your environment file
3. Run the test script to verify the connection
4. Once working, the integration will automatically:
   - Create contacts when users sign up
   - Tag them appropriately
   - Track events and interactions

## Support Resources
- [GoHighLevel API Documentation](https://highlevel.stoplight.io/docs/integrations/0443d7d1a4bd0-overview)
- [API Authentication Guide](https://highlevel.stoplight.io/docs/integrations/00d0c0ecf8204-authentication)
- [Marketplace OAuth Guide](https://marketplace.gohighlevel.com/docs/oauth)