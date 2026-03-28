const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAjeuOrg() {
  const email = 'ajeu@gmail.com';
  console.log(`--- Verificando Organização e Produtos de: ${email} ---`);

  // 1. Get Auth record
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  const userAuth = users.find(u => u.email === email);

  if (!userAuth) {
    console.log('Usuário Auth não encontrado.');
    return;
  }

  // 2. Get Profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*, organizations(*)')
    .eq('id', userAuth.id)
    .single();

  if (profileError) {
    console.error('Erro ao buscar perfil:', profileError.message);
    return;
  }

  console.log(`Organização vinculada: ${profile.organizations?.name || 'NENHUMA'}`);
  console.log(`Organization ID: ${profile.organization_id}`);

  // 3. Check products for this org
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('organization_id', profile.organization_id);

  if (productError) {
    console.error('Erro ao buscar produtos:', productError.message);
  } else {
    console.log(`Total de produtos encontrados: ${products.length}`);
  }
}

checkAjeuOrg();
