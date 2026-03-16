
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const email = 'superadmin@gmail.com'; // E-mail que aparece nos prints
  console.log('Buscando organizações para:', email);
  
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_email', email);
    
  if (error) {
    console.error('Erro:', error);
    return;
  }
  
  console.log('Organizações encontradas:', orgs.length);
  orgs.forEach(o => {
    console.log(`- ID: ${o.id}, Nome: ${o.name}, Plano: ${o.plan}`);
  });
}

check();
