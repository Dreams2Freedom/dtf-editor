#!/usr/bin/env node
/**
 * Create a Partner Tools API key.
 *
 *   node scripts/create-partner-key.js "Gangsheet Builder"
 *
 * Prints the raw key ONCE — store it securely (only its sha256 hash is saved).
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
try {
  require('dotenv').config({ path: '.env.local' });
} catch {
  /* dotenv optional */
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
  );
  process.exit(1);
}

const name = process.argv[2];
if (!name) {
  console.error('Usage: node scripts/create-partner-key.js "<partner name>"');
  process.exit(1);
}

(async () => {
  const raw = 'ptk_' + crypto.randomBytes(24).toString('hex');
  const keyHash = crypto.createHash('sha256').update(raw).digest('hex');
  const keyPrefix = raw.slice(0, 12);

  const supabase = createClient(url, serviceKey);
  const { data, error } = await supabase
    .from('partner_api_keys')
    .insert({ name, key_hash: keyHash, key_prefix: keyPrefix })
    .select('id, name')
    .single();

  if (error) {
    console.error('Failed to create partner key:', error.message);
    process.exit(1);
  }

  console.log(`\n✅ Partner created: ${data.name}  (id: ${data.id})`);
  console.log('\n🔑 API KEY (shown ONCE — store it securely):\n');
  console.log(`   ${raw}\n`);
})();
