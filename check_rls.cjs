const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabase.from('organizations').select('id').limit(1);
  console.log('Orgs accessible with Service Role:', data);
  process.exit(0);
}

run();
