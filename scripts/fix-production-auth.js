import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function fixProductionAuth() {
  console.log('🔧 Fixing production authentication issues...\n');

  const issues = [];
  const fixes = [];

  // 1. Check APP_URL configuration
  console.log('1️⃣ Checking APP_URL configuration...');
  const envPath = join(rootDir, 'src/config/env.ts');
  const envContent = await fs.readFile(envPath, 'utf-8');

  if (envContent.includes("'http://localhost:3000'")) {
    issues.push('APP_URL defaults to localhost:3000');
    fixes.push({
      file: 'src/config/env.ts',
      issue: 'APP_URL fallback is localhost',
      fix: 'Remove localhost fallback or ensure NEXT_PUBLIC_APP_URL is set in production',
    });
  }

  // 2. Check cookie configurations
  console.log('2️⃣ Checking cookie configurations...');
  const testCookiePath = join(rootDir, 'src/app/api/test-cookie/route.ts');
  const testCookieContent = await fs.readFile(testCookiePath, 'utf-8');

  if (testCookieContent.includes('secure: false')) {
    issues.push('Test cookie route has hardcoded secure: false');
    fixes.push({
      file: 'src/app/api/test-cookie/route.ts',
      issue: 'Hardcoded secure: false',
      fix: "Change to: secure: process.env.NODE_ENV === 'production'",
    });
  }

  // 3. Check for environment variable issues
  console.log('3️⃣ Checking environment variables...');
  const clientPath = join(rootDir, 'src/lib/supabase/client.ts');
  const clientContent = await fs.readFile(clientPath, 'utf-8');

  if (clientContent.includes('process.env.NEXT_PUBLIC_')) {
    console.log('✅ Using NEXT_PUBLIC_ prefixed variables for client-side');
  } else {
    issues.push('Client-side code might be using server-only env vars');
  }

  // 4. Check Supabase configuration
  console.log('4️⃣ Checking Supabase configuration...');
  const supabaseConfigPath = join(rootDir, 'supabase/config.toml');
  const supabaseConfig = await fs.readFile(supabaseConfigPath, 'utf-8');

  if (supabaseConfig.includes('site_url = "http://localhost:3000"')) {
    issues.push('Supabase config has localhost site_url');
    fixes.push({
      file: 'supabase/config.toml',
      issue: 'site_url is set to localhost',
      fix: 'This is only for local development, production uses dashboard settings',
    });
  }

  // 5. Check for SSR/CSR mismatches
  console.log('5️⃣ Checking for SSR/CSR issues...');
  const middlewarePath = join(rootDir, 'src/middleware.ts');
  const middlewareContent = await fs.readFile(middlewarePath, 'utf-8');

  if (middlewareContent.includes('createMiddlewareClient')) {
    console.log('✅ Using middleware-specific Supabase client');
  }

  // Report findings
  console.log('\n📊 ANALYSIS COMPLETE\n');

  if (issues.length === 0) {
    console.log('✅ No critical issues found!');
  } else {
    console.log(`❌ Found ${issues.length} issues:\n`);
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });

    console.log('\n🔧 REQUIRED FIXES:\n');
    fixes.forEach((fix, i) => {
      console.log(`${i + 1}. File: ${fix.file}`);
      console.log(`   Issue: ${fix.issue}`);
      console.log(`   Fix: ${fix.fix}\n`);
    });
  }

  // Additional recommendations
  console.log('📋 ADDITIONAL RECOMMENDATIONS:\n');
  console.log('1. Ensure these environment variables are set in production:');
  console.log('   - NEXT_PUBLIC_APP_URL=https://dtfeditor.com');
  console.log('   - NEXT_PUBLIC_SUPABASE_URL (with https://)');
  console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY (server-side only)');
  console.log('\n2. In Supabase Dashboard, verify:');
  console.log('   - Site URL is set to https://dtfeditor.com');
  console.log('   - Redirect URLs include all necessary paths');
  console.log('   - Email templates are configured (or SMTP is set up)');
  console.log('\n3. Cookie settings for production:');
  console.log('   - secure: true (or process.env.NODE_ENV === "production")');
  console.log('   - sameSite: "lax" or "strict"');
  console.log('   - httpOnly: true (for auth cookies)');
  console.log('\n4. Clear browser cookies and cache after deployment');
}

fixProductionAuth().catch(console.error);
