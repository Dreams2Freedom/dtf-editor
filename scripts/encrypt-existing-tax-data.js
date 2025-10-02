/**
 * Migration Script: Encrypt Existing Tax Data
 *
 * This script migrates any existing unencrypted tax IDs to encrypted format.
 * Run this ONCE when deploying the encryption update.
 *
 * Usage: node scripts/encrypt-existing-tax-data.js
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// Encryption function (same as in lib/encryption.ts)
function encryptSensitiveData(text) {
  if (!text) return null;

  if (!ENCRYPTION_KEY) {
    console.error('ERROR: ENCRYPTION_KEY not set!');
    process.exit(1);
  }

  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]);

    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
}

async function migrateAffiliateData() {
  console.log('🔐 Starting tax data encryption migration...\n');

  try {
    // Step 1: Check for any affiliates with plain text tax_id field
    console.log('📋 Fetching affiliates with potential unencrypted data...');

    const { data: affiliates, error: fetchError } = await supabase
      .from('affiliates')
      .select('id, tax_id, tax_id_encrypted, tax_form_data, referral_code')
      .not('tax_id', 'is', null);

    if (fetchError) {
      console.error('Error fetching affiliates:', fetchError);
      process.exit(1);
    }

    if (!affiliates || affiliates.length === 0) {
      console.log('✅ No affiliates with tax_id field found. Migration not needed.');
      return;
    }

    console.log(`Found ${affiliates.length} affiliate(s) to check.\n`);

    // Step 2: Process each affiliate
    let migrated = 0;
    let alreadyEncrypted = 0;
    let failed = 0;

    for (const affiliate of affiliates) {
      console.log(`Processing affiliate ${affiliate.referral_code}...`);

      // Check if already encrypted (has tax_id_encrypted)
      if (affiliate.tax_id_encrypted) {
        console.log(`  ✓ Already has encrypted data, skipping.`);
        alreadyEncrypted++;
        continue;
      }

      // Check if tax_id looks like it might already be encrypted
      if (affiliate.tax_id && affiliate.tax_id.length > 50) {
        console.log(`  ⚠️  tax_id appears to already be encrypted (length: ${affiliate.tax_id.length}), skipping.`);
        alreadyEncrypted++;
        continue;
      }

      // Encrypt the tax_id
      if (affiliate.tax_id) {
        const encrypted = encryptSensitiveData(affiliate.tax_id);

        if (!encrypted) {
          console.log(`  ❌ Failed to encrypt tax_id`);
          failed++;
          continue;
        }

        // Update the database
        const { error: updateError } = await supabase
          .from('affiliates')
          .update({
            tax_id_encrypted: encrypted,
            tax_id: null, // Clear the plain text field
            updated_at: new Date().toISOString()
          })
          .eq('id', affiliate.id);

        if (updateError) {
          console.log(`  ❌ Failed to update database:`, updateError.message);
          failed++;
        } else {
          console.log(`  ✅ Successfully encrypted and migrated`);
          migrated++;
        }
      }
    }

    // Step 3: Report results
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${migrated}`);
    console.log(`⏭️  Already encrypted: ${alreadyEncrypted}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📋 Total processed: ${affiliates.length}`);

    if (failed > 0) {
      console.log('\n⚠️  WARNING: Some records failed to migrate. Please review manually.');
      process.exit(1);
    }

    console.log('\n✨ Migration completed successfully!');

  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

// Add safety check
async function confirmMigration() {
  console.log('⚠️  WARNING: This script will encrypt existing tax data.');
  console.log('This should only be run ONCE during the encryption deployment.\n');

  if (!ENCRYPTION_KEY) {
    console.error('❌ ERROR: ENCRYPTION_KEY is not set in environment variables!');
    console.error('Please set ENCRYPTION_KEY in your .env.local file first.');
    process.exit(1);
  }

  console.log('Encryption key detected: ' + '•'.repeat(32) + ' (hidden)');
  console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n');

  return new Promise(resolve => {
    setTimeout(resolve, 5000);
  });
}

// Run the migration
async function main() {
  await confirmMigration();
  await migrateAffiliateData();
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});