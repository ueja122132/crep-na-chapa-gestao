const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const sql = `
    CREATE TABLE IF NOT EXISTS store_settings (
      id uuid default uuid_generate_v4() primary key,
      organization_id uuid references organizations(id) not null,
      key text not null,
      value text not null,
      unique(organization_id, key)
    );
  `;
  const { error } = await supabase.rpc('exec_sql', { sql });
  console.log('SQL Execution Error:', error || 'NONE');
}
run();
