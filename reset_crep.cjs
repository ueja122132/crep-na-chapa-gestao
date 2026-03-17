const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: orgs } = await supabase.from('organizations').select('name,owner_email').ilike('name', '%Crep na Chapa%');
  console.log('Orgs encontradas:', orgs);
  
  if (orgs && orgs.length > 0 && orgs[0].owner_email) {
    const email = orgs[0].owner_email;
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const u = users.find(x => x.email === email);
    if (u) {
      const { error } = await supabase.auth.admin.updateUserById(u.id, { password: 'password123' });
      console.log(`Senha do usuario ${email} definida para password123. Erro:`, error || 'NENHUM');
    } else {
      console.log('Usuario auth nao encontrado para o email', email);
    }
  } else {
    console.log('Org sem owner_email');
  }
}
run();
