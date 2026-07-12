const { getSupabaseAdmin } = require('../lib/supabase.js');

// Load env variables manually from .env.local
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const supabase = getSupabaseAdmin();

async function checkTable() {
  console.log('Checking Supabase connection...');
  try {
    // Try selecting from access_requests
    const { data, error } = await supabase
      .from('access_requests')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Supabase Error:', error);
      if (error.code === '42P01') {
        console.log('\n❌ ERROR: The table "access_requests" does not exist in your Supabase database!');
        console.log('👉 ACTION REQUIRED: You must run the SQL migration inside the Supabase SQL editor.');
      }
    } else {
      console.log('✅ Success! The "access_requests" table exists.');
      console.log('Current row count / data:', data);
    }
  } catch (err) {
    console.error('Failed to query database:', err);
  }
}

checkTable();
