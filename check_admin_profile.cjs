const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAdminProfile() {
  const email = 'admin@crepnachapa.com';
  console.log(`--- Verificando Perfil: ${email} ---`);

  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  const userAuth = users.find(u => u.email === email);

  if (!userAuth) {
    console.log('Admin Auth não encontrado.');
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*, organizations(*)')
    .eq('id', userAuth.id)
    .single();

  if (profileError) {
    console.error('Erro ao buscar perfil:', profileError.message);
  } else {
    console.log('Perfil Admin:', profile);
  }
}

checkAdminProfile();
