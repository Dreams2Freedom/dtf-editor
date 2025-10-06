#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Security patterns to check
const SECURITY_CHECKS = {
  authentication: {
    patterns: [
      /getServerSession/,
      /createClient.*cookies/,
      /user\.id/,
      /session\??\./,
      /req\.headers\.authorization/,
      /Bearer\s+/i,
    ],
    required: true,
    description: 'Authentication check',
  },
  adminCheck: {
    patterns: [
      /is_admin/,
      /isAdmin/,
      /profile\.is_admin/,
      /checkAdminAuth/,
      /adminOnly/,
    ],
    required: false, // Only for admin routes
    description: 'Admin authorization',
  },
  inputValidation: {
    patterns: [
      /\.json\(\)/,
      /JSON\.parse/,
      /zod/,
      /joi/,
      /validator/,
      /sanitize/,
      /escape/,
    ],
    required: true,
    description: 'Input validation',
  },
  errorHandling: {
    patterns: [
      /try\s*{/,
      /catch\s*\(/,
      /\.catch\(/,
      /NextResponse\.json\([^)]*[45]\d{2}/,
    ],
    required: true,
    description: 'Error handling',
  },
  rateLimiting: {
    patterns: [/rateLimit/, /rateLimiter/, /throttle/, /limiter/],
    required: false, // Should be implemented
    description: 'Rate limiting',
  },
  cors: {
    patterns: [/Access-Control/, /CORS/, /cors/, /origin/],
    required: false,
    description: 'CORS headers',
  },
  csrf: {
    patterns: [/csrf/, /CSRF/, /X-CSRF-Token/, /csrfToken/],
    required: false,
    description: 'CSRF protection',
  },
  sqlInjection: {
    patterns: [
      /\$\{.*\}/, // Template literals in SQL
      /\+\s*['"].*SELECT/i, // String concatenation with SQL
      /\+\s*['"].*INSERT/i,
      /\+\s*['"].*UPDATE/i,
      /\+\s*['"].*DELETE/i,
      /raw\(/, // Raw SQL queries
    ],
    antiPatterns: [
      /\$1/, // Parameterized queries
      /\?\?/, // Placeholder
      /prepared/i,
    ],
    required: false,
    description: 'SQL Injection vulnerability',
  },
  secrets: {
    patterns: [
      /api[_-]?key/i,
      /secret/i,
      /password/i,
      /token/i,
      /private[_-]?key/i,
    ],
    antiPatterns: [/process\.env/, /env\./, /import.*config/],
    required: false,
    description: 'Hardcoded secrets',
  },
  logging: {
    patterns: [/console\.(log|error|warn)/, /logger\./, /audit/i],
    required: false,
    description: 'Logging implementation',
  },
};

// Categorize endpoints
function categorizeEndpoint(filePath) {
  if (filePath.includes('/admin/')) return 'admin';
  if (filePath.includes('/webhooks/')) return 'webhook';
  if (filePath.includes('/auth/')) return 'auth';
  if (filePath.includes('/stripe/')) return 'payment';
  if (filePath.includes('/test-')) return 'test';
  if (filePath.includes('/debug-')) return 'debug';
  if (filePath.includes('/cron/')) return 'cron';
  if (filePath.includes('/storage/') || filePath.includes('/upload'))
    return 'storage';
  if (
    filePath.includes('/process/') ||
    filePath.includes('/upscale/') ||
    filePath.includes('/generate/')
  )
    return 'processing';
  return 'general';
}

// Check if endpoint has proper security
function analyzeEndpoint(filePath, content) {
  const category = categorizeEndpoint(filePath);
  const endpoint = filePath
    .replace(/.*\/api\//, '/api/')
    .replace('/route.ts', '');

  const issues = [];
  const implemented = [];
  const warnings = [];

  // Check HTTP methods
  const methods = [];
  if (content.includes('export async function GET')) methods.push('GET');
  if (content.includes('export async function POST')) methods.push('POST');
  if (content.includes('export async function PUT')) methods.push('PUT');
  if (content.includes('export async function DELETE')) methods.push('DELETE');
  if (content.includes('export async function PATCH')) methods.push('PATCH');

  // Check authentication (skip for webhooks and public endpoints)
  const publicEndpoints = [
    '/api/webhooks/',
    '/api/auth/callback',
    '/api/test-',
    '/api/debug-',
    '/pricing',
    '/coming-soon',
  ];
  const requiresAuth = !publicEndpoints.some(p => endpoint.includes(p));

  if (requiresAuth) {
    const hasAuth = SECURITY_CHECKS.authentication.patterns.some(pattern =>
      pattern.test(content)
    );
    if (!hasAuth) {
      issues.push('❌ Missing authentication');
    } else {
      implemented.push('✅ Authentication');
    }
  }

  // Check admin authorization for admin routes
  if (category === 'admin') {
    const hasAdminCheck = SECURITY_CHECKS.adminCheck.patterns.some(pattern =>
      pattern.test(content)
    );
    if (!hasAdminCheck) {
      issues.push('❌ Missing admin authorization check');
    } else {
      implemented.push('✅ Admin authorization');
    }
  }

  // Check input validation for POST/PUT/PATCH
  if (methods.some(m => ['POST', 'PUT', 'PATCH'].includes(m))) {
    const hasValidation = SECURITY_CHECKS.inputValidation.patterns.some(
      pattern => pattern.test(content)
    );
    if (!hasValidation) {
      warnings.push('⚠️  No explicit input validation');
    } else {
      implemented.push('✅ Input validation');
    }
  }

  // Check error handling
  const hasErrorHandling = SECURITY_CHECKS.errorHandling.patterns.some(
    pattern => pattern.test(content)
  );
  if (!hasErrorHandling) {
    warnings.push('⚠️  No try/catch error handling');
  } else {
    implemented.push('✅ Error handling');
  }

  // Check rate limiting
  const hasRateLimiting = SECURITY_CHECKS.rateLimiting.patterns.some(pattern =>
    pattern.test(content)
  );
  if (!hasRateLimiting && category !== 'test' && category !== 'debug') {
    warnings.push('⚠️  No rate limiting');
  } else if (hasRateLimiting) {
    implemented.push('✅ Rate limiting');
  }

  // Check for SQL injection vulnerabilities
  const hasSQLVuln =
    SECURITY_CHECKS.sqlInjection.patterns.some(pattern =>
      pattern.test(content)
    ) &&
    !SECURITY_CHECKS.sqlInjection.antiPatterns.some(pattern =>
      pattern.test(content)
    );
  if (hasSQLVuln) {
    issues.push('❌ Potential SQL injection vulnerability');
  }

  // Check for hardcoded secrets
  const hasSecrets =
    SECURITY_CHECKS.secrets.patterns.some(pattern => pattern.test(content)) &&
    !SECURITY_CHECKS.secrets.antiPatterns.some(pattern =>
      pattern.test(content)
    );
  if (hasSecrets) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (
        SECURITY_CHECKS.secrets.patterns.some(p => p.test(line)) &&
        !SECURITY_CHECKS.secrets.antiPatterns.some(p => p.test(line)) &&
        !line.includes('//') &&
        !line.includes('*')
      ) {
        warnings.push(`⚠️  Possible hardcoded secret at line ${idx + 1}`);
      }
    });
  }

  // Check for logging (especially for admin/payment endpoints)
  if (['admin', 'payment', 'auth'].includes(category)) {
    const hasLogging = SECURITY_CHECKS.logging.patterns.some(pattern =>
      pattern.test(content)
    );
    if (!hasLogging) {
      warnings.push('⚠️  No logging for sensitive operation');
    } else {
      implemented.push('✅ Logging');
    }
  }

  // Check CORS headers
  const hasCORS = SECURITY_CHECKS.cors.patterns.some(pattern =>
    pattern.test(content)
  );
  if (hasCORS) {
    implemented.push('✅ CORS configuration');
  }

  return {
    endpoint,
    category,
    methods,
    issues,
    warnings,
    implemented,
    requiresAuth,
    severity:
      issues.length > 0 ? 'high' : warnings.length > 2 ? 'medium' : 'low',
  };
}

// Find all route files
function findRouteFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findRouteFiles(fullPath));
    } else if (item === 'route.ts' || item === 'route.js') {
      files.push(fullPath);
    }
  }

  return files;
}

// Main audit function
function performAudit() {
  console.log('🔒 DTF Editor API Security Audit\n');
  console.log('='.repeat(80));

  const apiDir = path.join(__dirname, '../src/app/api');
  const routes = findRouteFiles(apiDir);

  console.log(`Found ${routes.length} API endpoints\n`);

  const results = {
    total: routes.length,
    secure: 0,
    warnings: 0,
    critical: 0,
    byCategory: {},
    criticalIssues: [],
    mediumIssues: [],
    summary: {
      authentication: 0,
      adminAuth: 0,
      inputValidation: 0,
      errorHandling: 0,
      rateLimiting: 0,
      logging: 0,
    },
  };

  // Analyze each endpoint
  routes.forEach(routePath => {
    const content = fs.readFileSync(routePath, 'utf-8');
    const analysis = analyzeEndpoint(routePath, content);

    // Update category stats
    if (!results.byCategory[analysis.category]) {
      results.byCategory[analysis.category] = {
        total: 0,
        secure: 0,
        issues: [],
      };
    }

    results.byCategory[analysis.category].total++;

    // Categorize by severity
    if (analysis.issues.length > 0) {
      results.critical++;
      results.criticalIssues.push({
        endpoint: analysis.endpoint,
        category: analysis.category,
        issues: analysis.issues,
        methods: analysis.methods,
      });
      results.byCategory[analysis.category].issues.push(analysis.endpoint);
    } else if (analysis.warnings.length > 0) {
      results.warnings++;
      if (analysis.warnings.length > 2) {
        results.mediumIssues.push({
          endpoint: analysis.endpoint,
          category: analysis.category,
          warnings: analysis.warnings,
          methods: analysis.methods,
        });
      }
    } else {
      results.secure++;
      results.byCategory[analysis.category].secure++;
    }

    // Update summary stats
    if (analysis.implemented.includes('✅ Authentication'))
      results.summary.authentication++;
    if (analysis.implemented.includes('✅ Admin authorization'))
      results.summary.adminAuth++;
    if (analysis.implemented.includes('✅ Input validation'))
      results.summary.inputValidation++;
    if (analysis.implemented.includes('✅ Error handling'))
      results.summary.errorHandling++;
    if (analysis.implemented.includes('✅ Rate limiting'))
      results.summary.rateLimiting++;
    if (analysis.implemented.includes('✅ Logging')) results.summary.logging++;
  });

  // Print report
  console.log('\n📊 AUDIT SUMMARY\n');
  console.log(`Total Endpoints: ${results.total}`);
  console.log(
    `✅ Secure: ${results.secure} (${((results.secure / results.total) * 100).toFixed(1)}%)`
  );
  console.log(
    `⚠️  Warnings: ${results.warnings} (${((results.warnings / results.total) * 100).toFixed(1)}%)`
  );
  console.log(
    `❌ Critical Issues: ${results.critical} (${((results.critical / results.total) * 100).toFixed(1)}%)`
  );

  console.log('\n📈 SECURITY IMPLEMENTATION COVERAGE\n');
  console.log(
    `Authentication: ${results.summary.authentication}/${results.total} (${((results.summary.authentication / results.total) * 100).toFixed(1)}%)`
  );
  console.log(
    `Admin Auth: ${results.summary.adminAuth}/${results.byCategory.admin?.total || 0}`
  );
  console.log(`Input Validation: ${results.summary.inputValidation} endpoints`);
  console.log(`Error Handling: ${results.summary.errorHandling} endpoints`);
  console.log(`Rate Limiting: ${results.summary.rateLimiting} endpoints`);
  console.log(`Logging: ${results.summary.logging} endpoints`);

  console.log('\n🏷️  ENDPOINTS BY CATEGORY\n');
  Object.entries(results.byCategory).forEach(([category, data]) => {
    console.log(
      `${category.toUpperCase()}: ${data.total} endpoints (${data.secure} secure)`
    );
    if (data.issues.length > 0) {
      console.log(
        `  Issues in: ${data.issues.slice(0, 3).join(', ')}${data.issues.length > 3 ? '...' : ''}`
      );
    }
  });

  if (results.criticalIssues.length > 0) {
    console.log('\n🚨 CRITICAL SECURITY ISSUES (Immediate Action Required)\n');
    results.criticalIssues.slice(0, 10).forEach(issue => {
      console.log(`${issue.endpoint} [${issue.methods.join(', ')}]`);
      issue.issues.forEach(i => console.log(`  ${i}`));
    });
    if (results.criticalIssues.length > 10) {
      console.log(
        `\n... and ${results.criticalIssues.length - 10} more critical issues`
      );
    }
  }

  if (results.mediumIssues.length > 0) {
    console.log('\n⚠️  MEDIUM PRIORITY ISSUES\n');
    results.mediumIssues.slice(0, 5).forEach(issue => {
      console.log(`${issue.endpoint} [${issue.methods.join(', ')}]`);
      issue.warnings.slice(0, 2).forEach(w => console.log(`  ${w}`));
    });
    if (results.mediumIssues.length > 5) {
      console.log(
        `\n... and ${results.mediumIssues.length - 5} more medium priority issues`
      );
    }
  }

  // Generate detailed report file
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      secure: results.secure,
      warnings: results.warnings,
      critical: results.critical,
      coverage: results.summary,
    },
    criticalIssues: results.criticalIssues,
    mediumIssues: results.mediumIssues,
    byCategory: results.byCategory,
  };

  fs.writeFileSync(
    path.join(__dirname, '../SECURITY_AUDIT_REPORT.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n📄 Detailed report saved to SECURITY_AUDIT_REPORT.json');

  // Recommendations
  console.log('\n🔧 TOP RECOMMENDATIONS\n');
  console.log('1. ❗ Implement rate limiting middleware for all endpoints');
  console.log('2. ❗ Add authentication checks to all non-public endpoints');
  console.log('3. ❗ Implement input validation using Zod or similar library');
  console.log('4. ⚠️  Add comprehensive error handling to all routes');
  console.log('5. ⚠️  Implement audit logging for sensitive operations');
  console.log('6. ⚠️  Set up CSRF protection for state-changing operations');
  console.log('7. 💡 Consider implementing API versioning');
  console.log('8. 💡 Add request/response interceptors for security headers');

  return results;
}

// Run the audit
performAudit();
