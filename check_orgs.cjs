const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: orgs } = await supabase.from('organizations').select('id, name, slug, plan, payment_status').order('created_at', { ascending: true });
  for(let org of orgs) {
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('org_id', org.id);
      org.product_count = count;
  }
  
  const fs = require('fs');
  fs.writeFileSync('orgs_info.json', JSON.stringify(orgs, null, 2));
  console.log('Orgs saved to orgs_info.json');
}

run();
