const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: orgs } = await supabase.from('organizations').select('id, name, slug, owner_email, plan');
  const fs = require('fs');
  fs.writeFileSync('orgs_owners.json', JSON.stringify(orgs, null, 2));
  console.log('Orgs saved');
}

run();
