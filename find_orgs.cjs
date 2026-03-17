const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabase.from('organizations').select('id, name, slug, plan, payment_status').order('created_at', { ascending: true });
  console.log(JSON.stringify(data, null, 2));
}

run();
