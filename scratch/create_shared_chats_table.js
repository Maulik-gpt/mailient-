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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
  });
}

const sql = `
CREATE TABLE IF NOT EXISTS shared_chats (
  id TEXT PRIMARY KEY,
  original_convo_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  title TEXT DEFAULT 'Shared Conversation',
  messages JSONB DEFAULT '[]',
  views INTEGER DEFAULT 0,
  is_unshared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for high-performance retrieval by owner
CREATE INDEX IF NOT EXISTS idx_shared_chats_owner ON shared_chats(owner_email);
`;

async function run() {
  const sb = getSupabaseAdmin();
  console.log('Executing SQL to create shared_chats table...');
  const { data, error } = await sb.rpc('exec_sql', { sql });
  if (error) {
    console.error('SQL Execution Error:', error);
  } else {
    console.log('✅ shared_chats table created/verified successfully!');
  }
}

run();
