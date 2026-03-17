const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: profiles } = await supabase.from('user_profiles').select('*');
  const fs = require('fs');
  fs.writeFileSync('profiles_info.json', JSON.stringify(profiles, null, 2));
  console.log('Profiles saved');
}

run();
