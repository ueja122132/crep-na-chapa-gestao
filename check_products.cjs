const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: prods } = await supabase.from('products').select('*');
  const fs = require('fs');
  fs.writeFileSync('products_info.json', JSON.stringify(prods, null, 2));
  console.log('Products saved');
}

run();
