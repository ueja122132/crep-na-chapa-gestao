
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, customer_name, total_price, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }

  console.log('Latest orders:');
  console.log(JSON.stringify(data, null, 2));
}

checkOrders();
