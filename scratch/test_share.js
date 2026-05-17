import fs from 'fs';
import path from 'path';
import { DatabaseService } from '../lib/supabase.js';

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

async function run() {
  const db = new DatabaseService();
  console.log('Testing createSharedConversation...');
  const testMessages = [
    { role: 'user', content: 'Hello AI' },
    { role: 'assistant', content: 'Hello user! How can I help you today?' }
  ];
  
  const created = await db.createSharedConversation(
    'test-user@mailient.xyz',
    'conv_test_123',
    testMessages,
    'My Awesome Chat'
  );

  console.log('Created Result:', created);

  if (created && created.id) {
    console.log('Testing getSharedConversation with ID:', created.id);
    const fetched = await db.getSharedConversation(created.id);
    console.log('Fetched Result:', fetched);

    console.log('Testing incrementSharedConversationViews...');
    await db.incrementSharedConversationViews(created.id, fetched.views);
    
    const fetchedAfterView = await db.getSharedConversation(created.id);
    console.log('Fetched After View Increment:', fetchedAfterView);
  }
}

run();
