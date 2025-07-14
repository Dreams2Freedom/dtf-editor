# Railway Deployment Guide

## Prerequisites
1. A GitHub account
2. A Railway account (sign up at https://railway.app)

## Step 1: Push to GitHub
First, make sure your code is in a GitHub repository:

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit for Railway deployment"

# Create a new repository on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Railway

1. **Go to Railway Dashboard**
   - Visit https://railway.app/dashboard
   - Sign in with your GitHub account

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Environment Variables**
   - Go to your project settings
   - Add these environment variables:
     ```
     VECTORIZER_API_ID=vkxq4f4d9b7qwjh
     VECTORIZER_API_SECRET=3i3cdh559d3e1csqi2e4rsk319qdrbn2otls0flbdjqo9qmrnkfj
     CLIPPING_MAGIC_API_ID=24469
     CLIPPING_MAGIC_API_SECRET=mngg89bme2has9hojc7n5cbjr8ptg3bjc8r3v225c555nhkvv11
     ```

4. **Deploy**
   - Railway will automatically detect your Node.js app
   - It will install dependencies and start your server
   - Your app will be available at the provided URL

## Step 3: Test Your Deployment

1. Visit your Railway app URL
2. Test the vectorization feature
3. Check the logs in Railway dashboard if there are any issues

## Benefits of Railway

✅ **Full Node.js Support**: No serverless limitations
✅ **Proper File Handling**: Multipart form data works correctly
✅ **Environment Variables**: Easy to manage API keys
✅ **Automatic Deployments**: Updates when you push to GitHub
✅ **Built-in Database**: Ready for user authentication
✅ **Scalable**: Easy to upgrade as you grow

## Next Steps

After successful deployment, you can:
1. Add user authentication
2. Set up image storage
3. Implement the paywall system
4. Add a database for user accounts

## Troubleshooting

If you encounter issues:
1. Check Railway logs in the dashboard
2. Verify environment variables are set correctly
3. Ensure all dependencies are in package.json
4. Check that the start script is correct 