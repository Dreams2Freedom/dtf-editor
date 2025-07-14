# 🚀 DTF Editor - Deployment Guide

This guide shows you how to deploy your DTF Editor to various hosted environments instead of running it locally.

## 🌟 Recommended: Vercel (Easiest)

Vercel is perfect for this application - it handles both static files and serverless API functions.

### Quick Deploy to Vercel:

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Follow the prompts:**
   - Link to existing project or create new
   - Set project name (e.g., "dtf-editor")
   - Deploy to production

4. **Your app will be live at:** `https://your-project.vercel.app`

### Manual Vercel Deploy:

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/dtf-editor.git
   git push -u origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Deploy automatically

## 🐳 Alternative: Docker + Cloud Platforms

### Dockerfile:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Deploy to:
- **Railway:** `railway up`
- **Render:** Connect GitHub repo
- **Heroku:** `heroku create && git push heroku main`
- **DigitalOcean App Platform:** Connect GitHub repo

## ☁️ Cloud Platforms

### 1. **Netlify Functions**
Create `netlify/functions/vectorize.js`:
```javascript
const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event) => {
  // Similar to Vercel function
};
```

### 2. **AWS Lambda + API Gateway**
- Create Lambda functions for each API endpoint
- Use API Gateway for routing
- Deploy frontend to S3 + CloudFront

### 3. **Google Cloud Functions**
- Similar to AWS Lambda
- Use Firebase Hosting for frontend

### 4. **Azure Functions**
- Serverless functions on Microsoft Azure
- Static Web Apps for frontend

## 🔧 Environment Variables

Set these in your hosting platform:

```bash
VECTORIZER_API_ID=vkxq4f4d9b7qwjh
VECTORIZER_API_SECRET=3i3cdh559d3e1csqi2e4rsk319qdrbn2otls0flbdjqo9qmrnkfj
CLIPPING_MAGIC_API_ID=24469
CLIPPING_MAGIC_API_SECRET=mngg89bme2has9hojc7n5cbjr8ptg3bjc8r3v225c555nhkvv11
```

## 📊 Performance & Scaling

### Vercel Benefits:
- ✅ Global CDN
- ✅ Automatic scaling
- ✅ Serverless functions
- ✅ Free tier available
- ✅ Easy custom domains

### Cost Estimation:
- **Vercel:** Free tier (100GB bandwidth, 100 serverless function executions/day)
- **Netlify:** Free tier (100GB bandwidth, 125K function invocations/month)
- **Railway:** $5/month (1GB RAM, shared CPU)
- **Render:** Free tier (750 hours/month)

## 🔒 Security Considerations

1. **API Keys:** Store in environment variables (never in code)
2. **CORS:** Configure properly for your domain
3. **File Upload Limits:** Set appropriate size limits
4. **Rate Limiting:** Consider implementing rate limits

## 🚀 Quick Start Commands

### Vercel (Recommended):
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Netlify:
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy

# Deploy to production
netlify deploy --prod
```

### Railway:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway up
```

## 🎯 Recommended Workflow

1. **Development:** Use local server (`python3 server.py` or `npm start`)
2. **Testing:** Deploy to Vercel staging
3. **Production:** Deploy to Vercel production
4. **Monitoring:** Use Vercel Analytics

## 📝 Custom Domain Setup

### Vercel:
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records as instructed

### Netlify:
1. Go to Site Settings → Domain Management
2. Add custom domain
3. Update DNS records

## 🔍 Troubleshooting

### Common Issues:
1. **CORS Errors:** Ensure API functions are properly configured
2. **File Upload Failures:** Check file size limits
3. **API Timeouts:** Increase function timeout in platform settings
4. **Environment Variables:** Verify all required variables are set

### Debug Commands:
```bash
# Check Vercel deployment
vercel logs

# Check Netlify deployment
netlify logs

# Test API endpoints
curl -X POST https://your-app.vercel.app/api/health
```

## 🎉 Success!

Once deployed, your DTF Editor will be:
- ✅ Accessible from anywhere
- ✅ No local setup required
- ✅ Automatically scaled
- ✅ Professionally hosted
- ✅ Ready for production use

Your users can simply visit your URL and start vectorizing images immediately! 