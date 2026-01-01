import { DatabaseService } from '../../../../lib/supabase.js';
import { auth } from '../../../../lib/auth.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    const session = await auth();
    const userEmail = email || session?.user?.email;

    const db = new DatabaseService();

    // Test connection
    const testResult = await db.supabase.from('user_profiles').select('count').limit(1);
    console.log('DB connection test:', testResult);

    // Check if tables exist by trying to select
    const tables = ['user_profiles', 'user_tokens', 'user_emails'];
    const tableStatus = {};

    for (const table of tables) {
      try {
        const result = await db.supabase.from(table).select('*').limit(1);
        tableStatus[table] = { exists: true, error: null };
        console.log(`${table} exists, sample:`, result);

        // Check columns
        const { data: columns, error: colError } = await db.supabase.rpc('get_table_columns', { table_name: table });
        if (colError) {
          console.log(`${table} columns check failed:`, colError.message);
          // Fallback to raw query
          const { data: colData, error: rawError } = await db.supabase
            .from('information_schema.columns')
            .select('column_name, data_type')
            .eq('table_name', table)
            .eq('table_schema', 'public');
          if (rawError) {
            console.log(`${table} raw columns check failed:`, rawError.message);
          } else {
            console.log(`${table} columns:`, colData);
            tableStatus[table].columns = colData;
          }
        } else {
          console.log(`${table} columns:`, columns);
          tableStatus[table].columns = columns;
        }
      } catch (error) {
        tableStatus[table] = { exists: false, error: error.message };
        console.log(`${table} does not exist:`, error.message);
      }
    }

    // Check user tokens if email provided
    let userTokens = null;
    if (userEmail) {
      try {
        userTokens = await db.getUserTokens(userEmail);
        console.log('User tokens for', userEmail, ':', {
          hasTokens: !!userTokens,
          hasEncryptedAccess: !!userTokens?.encrypted_access_token,
          hasEncryptedRefresh: !!userTokens?.encrypted_refresh_token,
          expiresAt: userTokens?.access_token_expires_at
        });
      } catch (error) {
        console.log('Error getting user tokens:', error);
        userTokens = { error: error.message };
      }
    }

    return Response.json({
      connection: 'ok',
      tables: tableStatus,
      userEmail: userEmail,
      userTokens: userTokens
    });
  } catch (error) {
    console.error('DB debug error:', error);
    return Response.json({
      connection: 'error',
      error: error.message
    }, { status: 500 });
  }
}

