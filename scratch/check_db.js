import fs from 'fs';
import path from 'path';
import { getSupabaseAdmin } from '../lib/supabase.js';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals === -1) return;
    const key = trimmed.substring(0, firstEquals).trim();
    let val = trimmed.substring(firstEquals + 1).trim();
    // Strip quotes if any
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
  });
}

async function run() {
  const sb = getSupabaseAdmin();
  console.log('Querying shared_chats table...');
  const { data, error } = await sb.from('shared_chats').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Sample Row:', data);
  }
}

run();
