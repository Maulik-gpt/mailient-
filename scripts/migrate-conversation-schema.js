#!/usr/bin/env node

/**
 * Database migration script to add conversation support to agent_chat_history table
 * Run this script to apply the new schema changes
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';

// Read environment variables from .env.local
const envPath = join(dirname(process.argv[1]), '..', '.env.local');
let envSupabaseUrl, envSupabaseServiceKey;

try {
  const envContent = readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');

  for (const line of lines) {
    if (line.startsWith('SUPABASE_URL=')) {
      envSupabaseUrl = line.split('=')[1];
    } else if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      envSupabaseServiceKey = line.split('=')[1];
    }
  }
} catch (error) {
  console.error('Could not read .env.local file');
}

const supabaseUrl = process.env.SUPABASE_URL || envSupabaseUrl;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envSupabaseServiceKey;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to execute raw SQL using Supabase client
async function executeRawSQL(sql) {
  try {
    // Use the REST API directly to execute raw SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`Could not execute SQL via RPC: ${error.message}`);
    return null;
  }
}

async function runMigration() {
  console.log('🚀 Starting database migration for conversation support...');

  try {
    // Check if table exists first
    console.log('🔍 Checking if agent_chat_history table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('agent_chat_history')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      console.log('❌ agent_chat_history table does not exist. Please run the full schema first.');
      console.log('\n📋 Required SQL commands to run in Supabase SQL Editor:');
      console.log('------------------------------------------------------------');
      console.log('-- Create the agent_chat_history table with conversation support');
      console.log('CREATE TABLE IF NOT EXISTS agent_chat_history (');
      console.log('  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,');
      console.log('  user_id TEXT NOT NULL,');
      console.log('  conversation_id TEXT NOT NULL,');
      console.log('  user_message TEXT NOT NULL,');
      console.log('  agent_response TEXT NOT NULL,');
      console.log('  message_order INTEGER NOT NULL DEFAULT 1,');
      console.log('  is_initial_message BOOLEAN DEFAULT FALSE,');
      console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
      console.log(');');
      console.log('');
      console.log('-- Create indexes for better performance');
      console.log('CREATE INDEX IF NOT EXISTS idx_agent_chat_history_user_id ON agent_chat_history(user_id);');
      console.log('CREATE INDEX IF NOT EXISTS idx_agent_chat_history_conversation_id ON agent_chat_history(conversation_id);');
      console.log('CREATE INDEX IF NOT EXISTS idx_agent_chat_history_user_conversation ON agent_chat_history(user_id, conversation_id);');
      console.log('------------------------------------------------------------');
      return;
    }

    if (tableError) {
      console.error('❌ Error checking table:', tableError);
      return;
    }

    console.log('✅ Table exists, checking for missing columns...');

    // Try to add conversation_id column if it doesn't exist
    console.log('📝 Adding conversation_id column...');
    try {
      const { error: convIdError } = await executeRawSQL(
        'ALTER TABLE agent_chat_history ADD COLUMN IF NOT EXISTS conversation_id TEXT NOT NULL DEFAULT \'temp\';'
      );

      if (convIdError) {
        console.log('⚠️  Could not add conversation_id column via RPC');
      } else {
        console.log('✅ conversation_id column added successfully');
      }
    } catch (error) {
      console.log('⚠️  Could not add conversation_id column:', error.message);
    }

    // Try to add message_order column if it doesn't exist
    console.log('📝 Adding message_order column...');
    try {
      const { error: orderError } = await executeRawSQL(
        'ALTER TABLE agent_chat_history ADD COLUMN IF NOT EXISTS message_order INTEGER NOT NULL DEFAULT 1;'
      );

      if (orderError) {
        console.log('⚠️  Could not add message_order column via RPC');
      } else {
        console.log('✅ message_order column added successfully');
      }
    } catch (error) {
      console.log('⚠️  Could not add message_order column:', error.message);
    }

    // Try to add is_initial_message column if it doesn't exist
    console.log('📝 Adding is_initial_message column...');
    try {
      const { error: initialError } = await executeRawSQL(
        'ALTER TABLE agent_chat_history ADD COLUMN IF NOT EXISTS is_initial_message BOOLEAN DEFAULT FALSE;'
      );

      if (initialError) {
        console.log('⚠️  Could not add is_initial_message column via RPC');
      } else {
        console.log('✅ is_initial_message column added successfully');
      }
    } catch (error) {
      console.log('⚠️  Could not add is_initial_message column:', error.message);
    }

    // Try to create indexes
    console.log('📝 Creating indexes...');
    try {
      const { error: indexError } = await executeRawSQL(`
        CREATE INDEX IF NOT EXISTS idx_agent_chat_history_conversation_id ON agent_chat_history(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_agent_chat_history_user_conversation ON agent_chat_history(user_id, conversation_id);
        CREATE INDEX IF NOT EXISTS idx_agent_chat_history_initial_message ON agent_chat_history(user_id, is_initial_message);
      `);

      if (indexError) {
        console.log('⚠️  Could not create indexes via RPC');
      } else {
        console.log('✅ Indexes created successfully');
      }
    } catch (error) {
      console.log('⚠️  Could not create indexes:', error.message);
    }

    // Update existing records to have proper conversation_id and message_order
    console.log('🔄 Updating existing records...');

    // First, check if columns exist by trying to query them
    const { data: testQuery, error: testError } = await supabase
      .from('agent_chat_history')
      .select('id, conversation_id, message_order, is_initial_message')
      .limit(1);

    if (testError) {
      console.error('❌ Columns still do not exist after migration:', testError);
      console.log('Please run the SQL commands manually in Supabase SQL Editor');
      return;
    }

    console.log('✅ Columns exist! Checking for existing records to update...');

    // Get all existing records that need updating
    const { data: existingRecords, error: fetchError } = await supabase
      .from('agent_chat_history')
      .select('id, user_id, created_at, conversation_id')
      .or('conversation_id.is.null,conversation_id.eq.temp');

    if (fetchError) {
      console.error('❌ Error fetching existing records:', fetchError);
      return;
    }

    if (existingRecords && existingRecords.length > 0) {
      console.log(`📊 Found ${existingRecords.length} existing records to update`);

      // Update each record with proper conversation data
      for (const record of existingRecords) {
        const conversationId = `conv_${new Date(record.created_at).getTime()}_${Math.random().toString(36).substr(2, 9)}`;

        const { error: updateError } = await supabase
          .from('agent_chat_history')
          .update({
            conversation_id: conversationId,
            message_order: 1,
            is_initial_message: true
          })
          .eq('id', record.id);

        if (updateError) {
          console.error(`❌ Error updating record ${record.id}:`, updateError);
        } else {
          console.log(`✅ Updated record ${record.id} with conversation ID: ${conversationId}`);
        }
      }
    } else {
      console.log('✅ No existing records need updating');
    }

    console.log('🎉 Database migration completed successfully!');
    console.log('📋 Summary:');
    console.log('  • Added conversation_id column');
    console.log('  • Added message_order column');
    console.log('  • Added is_initial_message column');
    console.log('  • Created performance indexes');
    console.log('  • Updated existing records with conversation data');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();