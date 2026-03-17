const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const fs = require('fs');
  fs.writeFileSync('users_info.json', JSON.stringify(users.users.map(u => ({id: u.id, email: u.email})), null, 2));
  console.log('Users saved');
}

run();
