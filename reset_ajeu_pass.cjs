const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndReset() {
  const email = 'ajeu@gmail.com';
  console.log(`--- Verificando usuário: ${email} ---`);

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Erro ao listar usuários:', listError.message);
    return;
  }

  const user = users.find(u => u.email === email);

  if (!user) {
    console.log(`Usuário ${email} NÃO encontrado no Auth.`);
    return;
  }

  console.log(`Usuário encontrado! ID: ${user.id}`);
  console.log(`Email confirmado: ${user.email_confirmed_at ? 'SIM' : 'NÃO'}`);
  console.log(`Último login: ${user.last_sign_in_at || 'Nunca'}`);

  console.log('--- Resetando senha para "password123" ---');
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: 'password123',
    email_confirm: true // Garante que o email esteja confirmado
  });

  if (updateError) {
    console.error('Erro ao resetar senha:', updateError.message);
  } else {
    console.log('Senha resetada com sucesso e email confirmado!');
  }
}

checkAndReset();
