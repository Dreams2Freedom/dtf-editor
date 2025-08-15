#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all admin API route files
const adminRoutes = glob.sync('src/app/api/admin/**/*.ts', {
  cwd: process.cwd(),
  absolute: false
});

console.log('🔍 Analyzing Admin API Routes for Audit Logging\n');

const routesNeedingAuditLog = [];
const routesWithAuditLog = [];

// Check each route file for audit logging
adminRoutes.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const hasAuditLog = content.includes('logAdminAction') || content.includes('adminAudit');
  
  if (hasAuditLog) {
    routesWithAuditLog.push(file);
  } else {
    // Check if it's a meaningful route that needs logging
    const needsLogging = 
      !file.includes('test-cookie') && // Exclude test endpoints
      !file.includes('/types/') && // Exclude type files
      (content.includes('export async function') || content.includes('export function')); // Has route handlers
    
    if (needsLogging) {
      routesNeedingAuditLog.push(file);
    }
  }
});

console.log('✅ Routes WITH Audit Logging:');
routesWithAuditLog.forEach(route => {
  console.log(`   - ${route}`);
});

console.log('\n❌ Routes MISSING Audit Logging:');
routesNeedingAuditLog.forEach(route => {
  console.log(`   - ${route}`);
});

// Generate recommendations for each missing route
console.log('\n📝 Audit Logging Recommendations:\n');

const recommendations = {
  'auth/login': {
    action: 'admin.login',
    details: 'Log successful and failed login attempts'
  },
  'auth/logout': {
    action: 'admin.logout',
    details: 'Log admin logout'
  },
  'auth/check': {
    action: null,
    details: 'No logging needed - just checking session'
  },
  'auth/2fa-verify': {
    action: 'admin.2fa_verified',
    details: 'Log 2FA verification attempts'
  },
  'users/stats': {
    action: 'analytics.view',
    details: 'Log viewing of user statistics'
  },
  'users/export': {
    action: 'user.export_data',
    details: 'Log data export with number of users exported'
  },
  'users/send-email': {
    action: 'email.send',
    details: 'Log email sending with recipient count'
  },
  'users/bulk': {
    action: 'user.bulk_update',
    details: 'Log bulk operations with affected user count'
  },
  'users/bulk-credits': {
    action: 'credits.adjust',
    details: 'Log bulk credit operations'
  },
  'dashboard/stats': {
    action: 'analytics.view',
    details: 'Log dashboard statistics access'
  },
  'analytics/active-users': {
    action: 'analytics.view',
    details: 'Log active users analytics access'
  },
  'analytics/kpi': {
    action: 'analytics.view',
    details: 'Log KPI analytics access'
  },
  'analytics/revenue': {
    action: 'analytics.view',
    details: 'Log revenue analytics access'
  },
  'notifications/send': {
    action: 'email.campaign',
    details: 'Log notification campaigns'
  },
  'audit/logs': {
    action: 'audit.view',
    details: 'Log viewing of audit logs (meta!)'
  }
};

routesNeedingAuditLog.forEach(route => {
  const routePath = route.replace('src/app/api/admin/', '').replace('/route.ts', '');
  
  // Find matching recommendation
  let recommendation = null;
  for (const [key, value] of Object.entries(recommendations)) {
    if (routePath.includes(key)) {
      recommendation = value;
      break;
    }
  }
  
  if (recommendation && recommendation.action) {
    console.log(`📍 ${routePath}:`);
    console.log(`   Action: ${recommendation.action}`);
    console.log(`   ${recommendation.details}`);
    console.log('');
  }
});

console.log('📊 Summary:');
console.log(`   Total admin routes: ${adminRoutes.length}`);
console.log(`   Routes with logging: ${routesWithAuditLog.length}`);
console.log(`   Routes needing logging: ${routesNeedingAuditLog.length}`);
console.log(`   Coverage: ${Math.round((routesWithAuditLog.length / adminRoutes.length) * 100)}%`);

console.log('\n💡 To add audit logging, import at the top of each file:');
console.log("   import { logAdminAction, getClientIp, getUserAgent } from '@/utils/adminLogger';");
console.log('\nThen add logging calls in appropriate handlers.');