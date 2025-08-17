#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Categorize endpoints for appropriate rate limits
function getEndpointType(filePath) {
  if (filePath.includes('/admin/')) return 'admin';
  if (filePath.includes('/webhooks/')) return 'webhook';
  if (filePath.includes('/auth/')) return 'auth';
  if (filePath.includes('/stripe/') || filePath.includes('/payment')) return 'payment';
  if (filePath.includes('/upload') || filePath.includes('/storage/')) return 'upload';
  if (filePath.includes('/process/') || filePath.includes('/upscale/') || filePath.includes('/generate/')) return 'processing';
  if (filePath.includes('/test-') || filePath.includes('/debug-')) return 'public'; // Test endpoints get relaxed limits
  if (filePath.includes('/cron/')) return 'api'; // Cron jobs
  return 'api';
}

// Check if file already has rate limiting
function hasRateLimiting(content) {
  return content.includes('withRateLimit') || content.includes('rateLimit(');
}

// Check if file has authentication
function hasAuthentication(content) {
  return content.includes('requireAuth') || 
         content.includes('requireAdmin') || 
         content.includes('getServerSession') || 
         content.includes('verifyAuth') ||
         content.includes('supabase.auth.getUser');
}

// Add rate limiting to a route file
function addRateLimiting(filePath, content) {
  const endpointType = getEndpointType(filePath);
  
  // Don't add rate limiting to webhook endpoints (they have their own protection)
  if (endpointType === 'webhook') {
    return { modified: false, content };
  }
  
  // Check if already has rate limiting
  if (hasRateLimiting(content)) {
    return { modified: false, content };
  }
  
  // Find HTTP method exports
  const methods = [];
  const methodRegex = /export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(/g;
  let match;
  
  while ((match = methodRegex.exec(content)) !== null) {
    methods.push(match[2]);
  }
  
  if (methods.length === 0) {
    return { modified: false, content };
  }
  
  let modifiedContent = content;
  let importsAdded = false;
  
  // Add import if not present
  if (!content.includes("import { withRateLimit }")) {
    // Find the last import statement
    const lastImportMatch = content.match(/^import[^;]+;/gm);
    if (lastImportMatch) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      const insertPosition = content.indexOf(lastImport) + lastImport.length;
      modifiedContent = 
        content.slice(0, insertPosition) + 
        "\nimport { withRateLimit } from '@/lib/rate-limit';" +
        content.slice(insertPosition);
      importsAdded = true;
    }
  }
  
  // Wrap each method with rate limiting
  methods.forEach(method => {
    // Find the function and wrap it
    const functionRegex = new RegExp(
      `export\\s+(async\\s+)?function\\s+${method}\\s*\\([^)]*\\)\\s*(?::[^{]+)?\\s*{`,
      'g'
    );
    
    const functionMatch = functionRegex.exec(modifiedContent);
    if (functionMatch) {
      // Rename the function to have a handler prefix
      const newFunctionName = `handle${method.charAt(0) + method.slice(1).toLowerCase()}`;
      
      // Replace export function with internal function
      modifiedContent = modifiedContent.replace(
        functionMatch[0],
        functionMatch[0].replace('export ', '').replace(method, newFunctionName)
      );
      
      // Add the export with rate limiting at the end
      const exportStatement = `\n\n// Apply rate limiting\nexport const ${method} = withRateLimit(${newFunctionName}, '${endpointType}');`;
      
      // Check if this export already exists
      if (!modifiedContent.includes(`export const ${method} =`)) {
        modifiedContent += exportStatement;
      }
    }
  });
  
  return { 
    modified: importsAdded || methods.length > 0, 
    content: modifiedContent,
    methods,
    endpointType
  };
}

// Process all route files
function processRouteFiles(dir) {
  const stats = {
    total: 0,
    modified: 0,
    skipped: 0,
    errors: 0,
    byType: {}
  };
  
  function walkDir(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (file === 'route.ts' || file === 'route.js') {
        stats.total++;
        
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const result = addRateLimiting(fullPath, content);
          
          if (result.modified) {
            // Write the modified content back
            fs.writeFileSync(fullPath, result.content);
            stats.modified++;
            
            // Track by type
            if (!stats.byType[result.endpointType]) {
              stats.byType[result.endpointType] = 0;
            }
            stats.byType[result.endpointType]++;
            
            console.log(`✅ Added rate limiting to: ${fullPath.replace(dir, '')} [${result.endpointType}]`);
            console.log(`   Methods: ${result.methods.join(', ')}`);
          } else {
            stats.skipped++;
            const reason = hasRateLimiting(content) ? 'already has rate limiting' : 'webhook or no methods';
            console.log(`⏭️  Skipped: ${fullPath.replace(dir, '')} (${reason})`);
          }
        } catch (error) {
          stats.errors++;
          console.error(`❌ Error processing ${fullPath}:`, error.message);
        }
      }
    }
  }
  
  walkDir(dir);
  return stats;
}

// Main execution
console.log('🔒 Applying Rate Limiting to API Endpoints\n');
console.log('=' .repeat(60) + '\n');

const apiDir = path.join(__dirname, '../src/app/api');
const stats = processRouteFiles(apiDir);

console.log('\n' + '=' .repeat(60));
console.log('\n📊 Summary:');
console.log(`Total endpoints: ${stats.total}`);
console.log(`Modified: ${stats.modified}`);
console.log(`Skipped: ${stats.skipped}`);
console.log(`Errors: ${stats.errors}`);

if (Object.keys(stats.byType).length > 0) {
  console.log('\n📈 Modified by type:');
  Object.entries(stats.byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
}

console.log('\n✅ Rate limiting application complete!');
console.log('\n⚠️  Note: Review modified files and test thoroughly before deploying.');
console.log('💡 Consider adding Upstash Redis for production rate limiting.');