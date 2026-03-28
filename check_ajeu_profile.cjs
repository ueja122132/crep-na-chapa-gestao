const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserProfile() {
  const userId = 'ad52c217-ba21-4e9e-8438-73476cb6986b';
  console.log(`--- Verificando perfil do usuário: ${userId} ---`);

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Erro ao buscar perfil:', error.message);
    if (error.code === 'PGRST116') {
      console.log('Perfil NÃO existe. Criando perfil padrão...');
      // Check for available organizations
      const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
      const orgId = orgs && orgs.length > 0 ? orgs[0].id : null;

      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          full_name: 'Ajeu',
          role: 'admin',
          organization_id: orgId
        });
      
      if (insertError) {
        console.error('Erro ao criar perfil:', insertError.message);
      } else {
        console.log('Perfil criado com sucesso!');
      }
    }
    return;
  }

  console.log('Perfil encontrado:', profile);
}

checkUserProfile();
