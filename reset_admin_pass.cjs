const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetAdminPass() {
  const email = 'admin@crepnachapa.com';
  console.log(`--- Resetando senha de: ${email} ---`);

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    console.log('Usuário não encontrado.');
    return;
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: 'admin123',
    email_confirm: true
  });

  if (updateError) {
    console.error('Erro ao resetar:', updateError.message);
  } else {
    console.log('Senha resetada para "admin123" e email confirmado!');
  }
}

resetAdminPass();
