#!/usr/bin/env node

/**
 * Fix for BUG-005: Standardize database column naming
 * Ensures we only use credits_remaining, not credits
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Check if 'credits' column exists in profiles table
 */
async function checkForCreditsColumn() {
  console.log('🔍 Checking for credits column in profiles table...\n');

  const { data, error } = await supabase.from('profiles').select('*').limit(1);

  if (error) {
    console.error('Error checking profiles:', error);
    return false;
  }

  if (data && data[0]) {
    const hasCredits = 'credits' in data[0];
    const hasCreditsRemaining = 'credits_remaining' in data[0];

    console.log('  credits column exists:', hasCredits);
    console.log('  credits_remaining column exists:', hasCreditsRemaining);

    return { hasCredits, hasCreditsRemaining };
  }

  return { hasCredits: false, hasCreditsRemaining: false };
}

/**
 * Migrate data from credits to credits_remaining if needed
 */
async function migrateCreditsData() {
  const { hasCredits, hasCreditsRemaining } = await checkForCreditsColumn();

  if (hasCredits && hasCreditsRemaining) {
    console.log(
      '\n⚠️ Both columns exist. Migrating data from credits to credits_remaining...\n'
    );

    // Get all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, credits, credits_remaining');

    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }

    let migratedCount = 0;

    for (const profile of profiles) {
      // Only migrate if credits has a value and credits_remaining doesn't
      if (
        profile.credits !== null &&
        profile.credits !== undefined &&
        (profile.credits_remaining === null || profile.credits_remaining === 0)
      ) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ credits_remaining: profile.credits })
          .eq('id', profile.id);

        if (updateError) {
          console.error(`Error updating profile ${profile.id}:`, updateError);
        } else {
          migratedCount++;
          console.log(
            `  ✅ Migrated ${profile.credits} credits for user ${profile.id}`
          );
        }
      }
    }

    console.log(`\n📊 Migrated ${migratedCount} profiles`);

    // Generate SQL to drop the credits column
    console.log(
      '\n📝 SQL to drop credits column (run this manually if migration is successful):\n'
    );
    console.log('ALTER TABLE profiles DROP COLUMN IF EXISTS credits;');
  } else if (!hasCreditsRemaining) {
    console.log(
      '\n❌ credits_remaining column does not exist! Creating it...\n'
    );

    // This shouldn't happen, but if it does, we need to create the column
    console.log('Run this SQL:\n');
    console.log(
      'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 0;'
    );
  } else {
    console.log(
      '\n✅ Database schema is correct (only credits_remaining exists)'
    );
  }
}

/**
 * Update code references from credits to credits_remaining
 */
function generateCodeFixes() {
  console.log('\n📝 Code fixes to apply:\n');

  const fixes = [
    {
      file: '/src/stores/authStore.ts',
      change: 'Remove fallback to profile?.credits',
      from: 'profile?.credits ?? profile?.credits_remaining ?? 0',
      to: 'profile?.credits_remaining ?? 0',
    },
    {
      file: '/src/types/index.ts',
      change: 'Remove credits field from UserProfile type if it exists',
      from: 'credits?: number;',
      to: '// removed - use credits_remaining instead',
    },
  ];

  fixes.forEach(fix => {
    console.log(`File: ${fix.file}`);
    console.log(`Change: ${fix.change}`);
    console.log(`From: ${fix.from}`);
    console.log(`To: ${fix.to}`);
    console.log('');
  });
}

/**
 * Fix code files
 */
async function fixCodeFiles() {
  console.log('\n🔧 Fixing code files...\n');

  // Fix authStore.ts
  const authStorePath = path.join(process.cwd(), 'src/stores/authStore.ts');
  if (fs.existsSync(authStorePath)) {
    let content = fs.readFileSync(authStorePath, 'utf8');

    // Replace all instances of the fallback pattern
    const oldPattern =
      /profile\?\.credits \?\? profile\?\.credits_remaining \?\? 0/g;
    const newPattern = 'profile?.credits_remaining ?? 0';

    if (content.match(oldPattern)) {
      content = content.replace(oldPattern, newPattern);
      fs.writeFileSync(authStorePath, content);
      console.log('  ✅ Fixed authStore.ts');
    } else {
      console.log('  ℹ️ authStore.ts already correct or different pattern');
    }
  }

  // Check types file
  const typesPath = path.join(process.cwd(), 'src/types/index.ts');
  if (fs.existsSync(typesPath)) {
    let content = fs.readFileSync(typesPath, 'utf8');

    if (content.includes('credits?:') || content.includes('credits:')) {
      console.log(
        '  ⚠️ Found credits field in types/index.ts - please review manually'
      );
    } else {
      console.log('  ✅ types/index.ts looks correct');
    }
  }
}

// Run the fix
(async () => {
  console.log('🚀 Starting credits column standardization...\n');

  await migrateCreditsData();
  generateCodeFixes();
  await fixCodeFiles();

  console.log('\n✅ Done!');
  console.log('\n⚠️ Remember to:');
  console.log('1. Test the application thoroughly');
  console.log('2. Run the DROP COLUMN SQL if everything works');
  console.log('3. Update any other references to "credits" field');
})();
