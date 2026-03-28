const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findUsersWithProducts() {
  console.log('--- Buscando usuários com produtos cadastrados ---');

  // 1. Get unique organization_ids from products table
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('organization_id');

  if (productError) {
    console.error('Erro ao buscar produtos:', productError.message);
    return;
  }

  const orgIdsWithProducts = [...new Set(products.map(p => p.organization_id))].filter(id => id !== null);

  if (orgIdsWithProducts.length === 0) {
    console.log('Nenhum produto cadastrado em nenhuma organização.');
    return;
  }

  console.log(`Encontradas ${orgIdsWithProducts.length} organizações com produtos.`);

  // 2. Find organizations and their owners/members
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, owner_email')
    .in('id', orgIdsWithProducts);

  if (orgError) {
    console.error('Erro ao buscar organizações:', orgError.message);
    return;
  }

  // 3. Find profiles for these organizations
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, full_name, role, organization_id')
    .in('organization_id', orgIdsWithProducts);

  if (profileError) {
    console.error('Erro ao buscar perfis:', profileError.message);
    return;
  }

  // 4. Get auth info for these profiles
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('Erro ao listar usuários auth:', authError.message);
    return;
  }

  const results = orgs.map(org => {
    const orgProfiles = profiles.filter(p => p.organization_id === org.id);
    const orgUsers = orgProfiles.map(p => {
      const authUser = users.find(u => u.id === p.id);
      return {
        email: authUser ? authUser.email : 'Email não encontrado',
        name: p.full_name,
        role: p.role
      };
    });

    return {
      orgName: org.name,
      ownerEmail: org.owner_email,
      members: orgUsers,
      productCount: products.filter(p => p.organization_id === org.id).length
    };
  });

  console.log(JSON.stringify(results, null, 2));
}

findUsersWithProducts();
