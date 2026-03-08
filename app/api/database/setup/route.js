// app/api/database/setup/route.js
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase.js";

// CRITICAL: Force dynamic rendering to prevent build-time evaluation
export const dynamic = 'force-dynamic';

const supabase = new Proxy({}, {
  get: (target, prop) => getSupabaseAdmin()[prop]
});

export async function POST(req) {
  try {
    const adminSecret = (process.env.DB_SETUP_ADMIN_SECRET || '').trim();
    const provided = (req.headers.get('x-admin-secret') || '').trim();
    if (!adminSecret || provided !== adminSecret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log("Setting up database tables...");

    const results = [];

    // Test each table by attempting to insert and then delete a test record
    const tables = ['user_profiles', 'user_tokens', 'user_emails', 'agent_chat_history'];

    for (const tableName of tables) {
      try {
        console.log(`Testing ${tableName} table...`);

        // Try to insert a test record
        const testData = {
          user_id: `test_${Date.now()}`,
          email: 'test@example.com'
        };

        const { data, error } = await supabase
          .from(tableName)
          .insert(testData)
          .select('id')
          .single();

        if (error) {
          if (error.message.includes('does not exist')) {
            console.log(`${tableName} table does not exist`);
            results.push({ table: tableName, status: 'missing', error: 'Table does not exist' });
          } else {
            console.log(`${tableName} table exists but has schema issues:`, error.message);
            results.push({ table: tableName, status: 'schema_issue', error: error.message });
          }
        } else {
          // If successful, delete the test record
          if (data?.id) {
            await supabase.from(tableName).delete().eq('id', data.id);
          }
          console.log(`${tableName} table exists and working`);
          results.push({ table: tableName, status: 'exists' });
        }
      } catch (tableError) {
        console.error(`Error testing ${tableName}:`, tableError);
        results.push({ table: tableName, status: 'error', error: tableError.message });
      }
    }

    // Return setup instructions
    const missingTables = results.filter(r => r.status === 'missing').map(r => r.table);

    if (missingTables.length > 0) {
      return NextResponse.json({
        message: "Database setup required",
        status: "missing_tables",
        missing_tables: missingTables,
        instructions: [
          "1. Go to your Supabase dashboard",
          "2. Navigate to SQL Editor",
          "3. Copy and paste the schema from supabase-schema.sql",
          "4. Run the SQL to create all tables",
          "5. Try accessing the profile page again"
        ],
        results: results,
        timestamp: new Date().toISOString()
      }, { status: 200 });
    }

    return NextResponse.json({
      message: "Database setup completed - all tables exist",
      status: "ready",
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Database setup error:", error);
    return NextResponse.json({
      error: "Database setup failed",
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint to check database status and auto-create missing tables
export async function GET(req) {
  try {
    const adminSecret = (process.env.DB_SETUP_ADMIN_SECRET || '').trim();
    const provided = (req.headers.get('x-admin-secret') || '').trim();
    if (!adminSecret || provided !== adminSecret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log("🔧 Checking database status and creating missing tables...");

    const results = [];

    // Test each table
    const tables = ['user_profiles', 'user_tokens', 'user_emails', 'agent_chat_history'];

    for (const tableName of tables) {
      try {
        const { error } = await supabase
          .from(tableName)
          .select('id')
          .limit(1);

        if (error && error.message.includes('does not exist')) {
          results.push({ table: tableName, status: 'missing' });
          // Try to create the table
          await createTable(tableName);
        } else {
          results.push({ table: tableName, status: 'exists' });
        }
      } catch (tableError) {
        results.push({ table: tableName, status: 'error', error: tableError.message });
      }
    }

    // Create additional tables for enhanced functionality
    await createEnhancedTables();

    return NextResponse.json({
      database_status: results,
      message: "Database check and setup completed",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      error: "Database status check failed",
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Create a specific table
 */
async function createTable(tableName) {
  try {
    console.log(`Creating ${tableName} table...`);

    let createSQL = '';

    switch (tableName) {
      case 'user_tokens':
        createSQL = `
          CREATE TABLE IF NOT EXISTS user_tokens (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id TEXT NOT NULL,
            google_email TEXT UNIQUE NOT NULL,
            encrypted_access_token TEXT NOT NULL,
            encrypted_refresh_token TEXT,
            access_token_expires_at TIMESTAMP WITH TIME ZONE,
            token_type TEXT DEFAULT 'Bearer',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_tokens_google_email ON user_tokens(google_email);
        `;
        break;

      case 'user_profiles':
        createSQL = `
          CREATE TABLE IF NOT EXISTS user_profiles (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id TEXT UNIQUE NOT NULL,
            email TEXT NOT NULL,
            name TEXT,
            picture TEXT,
            avatar_url TEXT,
            bio TEXT,
            location TEXT,
            website TEXT,
            status TEXT DEFAULT 'online',
            preferences JSONB DEFAULT '{"theme": "dark", "language": "en", "notifications": true, "email_frequency": "daily", "timezone": "UTC"}',
            birthdate DATE,
            gender TEXT,
            work_status TEXT,
            interests TEXT[],
            last_synced_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
        `;
        break;

      case 'user_emails':
        createSQL = `
          CREATE TABLE IF NOT EXISTS user_emails (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id TEXT NOT NULL,
            email_id TEXT NOT NULL,
            thread_id TEXT,
            subject TEXT,
            from_email TEXT,
            to_email TEXT,
            date TIMESTAMP WITH TIME ZONE,
            snippet TEXT,
            labels JSONB DEFAULT '[]',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, email_id)
          );
          
          CREATE INDEX IF NOT EXISTS idx_user_emails_user_id ON user_emails(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_emails_date ON user_emails(user_id, date DESC);
        `;
        break;

      case 'agent_chat_history':
        createSQL = `
          CREATE TABLE IF NOT EXISTS agent_chat_history (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id TEXT NOT NULL,
            conversation_id TEXT NOT NULL,
            user_message TEXT NOT NULL,
            agent_response TEXT NOT NULL,
            message_order INTEGER NOT NULL DEFAULT 1,
            is_initial_message BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_agent_chat_history_user_id ON agent_chat_history(user_id);
          CREATE INDEX IF NOT EXISTS idx_agent_chat_history_conversation_id ON agent_chat_history(conversation_id);
        `;
        break;
    }

    if (createSQL) {
      const { error } = await supabase.rpc('exec_sql', { sql: createSQL });
      if (error) {
        console.error(`Error creating ${tableName}:`, error);
        throw error;
      }
      console.log(`✅ ${tableName} table created successfully`);
    }

  } catch (error) {
    console.error(`Failed to create ${tableName} table:`, error);
    throw error;
  }
}

/**
 * Create additional tables for enhanced functionality
 */
async function createEnhancedTables() {
  try {
    console.log("Creating enhanced tables...");

    // Create contacts table for CRM functionality
    const contactsSQL = `
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        company TEXT,
        position TEXT,
        source TEXT DEFAULT 'manual',
        notes TEXT,
        tags TEXT[] DEFAULT '{}',
        last_contacted_at TIMESTAMP WITH TIME ZONE,
        next_follow_up_at TIMESTAMP WITH TIME ZONE,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'converted', 'lost')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, email)
      );
       
      CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
      CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
    `;

    // Create insights table for storing AI-generated insights
    const insightsSQL = `
      CREATE TABLE IF NOT EXISTS insights (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT NOT NULL,
        insight_type TEXT NOT NULL CHECK (insight_type IN ('lead', 'opportunity', 'follow_up', 'priority', 'pattern', 'recommendation')),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        source_email_ids TEXT[],
        confidence_score REAL DEFAULT 0.5,
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        status TEXT DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'actioned', 'dismissed')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE
      );
       
      CREATE INDEX IF NOT EXISTS idx_insights_user_id ON insights(user_id);
      CREATE INDEX IF NOT EXISTS idx_insights_type ON insights(insight_type);
      CREATE INDEX IF NOT EXISTS idx_insights_priority ON insights(priority);
      CREATE INDEX IF NOT EXISTS idx_insights_status ON insights(status);
    `;

    // Create unsubscribed_emails table
    const unsubscribedSQL = `
      CREATE TABLE IF NOT EXISTS unsubscribed_emails (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT NOT NULL,
        email_id TEXT NOT NULL,
        sender_email TEXT NOT NULL,
        sender_name TEXT,
        subject TEXT,
        received_at TIMESTAMP WITH TIME ZONE,
        snippet TEXT,
        category TEXT,
        user_email TEXT NOT NULL,
        unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
       
      CREATE INDEX IF NOT EXISTS idx_unsubscribed_emails_user_id ON unsubscribed_emails(user_id);
      CREATE INDEX IF NOT EXISTS idx_unsubscribed_emails_email_id ON unsubscribed_emails(email_id);
      CREATE INDEX IF NOT EXISTS idx_unsubscribed_emails_sender ON unsubscribed_emails(sender_email);
    `;

    const statements = [contactsSQL, insightsSQL, unsubscribedSQL];

    for (const sql of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
          console.error('Error executing SQL:', error);
        }
      } catch (sqlError) {
        console.error('SQL execution error:', sqlError);
      }
    }

    console.log('✅ Enhanced tables creation completed');

  } catch (error) {
    console.error('Failed to create enhanced tables:', error);
  }
}
