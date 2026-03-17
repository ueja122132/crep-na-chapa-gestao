const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  try {
    const nextBilling = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    console.log('Testing update...');
    const { error } = await supabase
      .from('organizations')
      .update({
        payment_status: 'paid',
        status: 'active',
        subscription_expires_at: nextBilling
      })
      .eq('id', '9b1462c0-d902-4fdc-9542-7a92f6c28402');
      
    const fs = require('fs');
    fs.writeFileSync('update_error.json', JSON.stringify({error}, null, 2));
    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
