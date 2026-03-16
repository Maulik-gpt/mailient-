const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

check();
