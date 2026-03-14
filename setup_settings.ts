
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function setupSettings() {
  console.log('Criando tabela de configurações...');
  
  const { error: tableError } = await supabase.rpc('execute_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      INSERT INTO settings (key, value)
      VALUES ('extra_ingredient_price', '5.00')
      ON CONFLICT (key) DO NOTHING;
    `
  });

  if (tableError) {
    // Se o RPC execute_sql não existir, tentamos via query direta (se o client permitir)
    // No entanto, o supabase-js não tem .query(). Vamos tentar inserir diretamente assumindo que a tabela existe
    // ou que o usuário vai criar manualmente se falhar.
    // Outra opção é usar a API REST do Supabase para Postgres se habilitada.
    console.error('Erro ao criar tabela (pode ser falta de permissão RPC):', tableError);
    
    // Tentativa alternativa: Apenas inserir se a tabela já existir
    const { error: insertError } = await supabase
      .from('settings')
      .upsert({ key: 'extra_ingredient_price', value: '5.00' }, { onConflict: 'key' });
      
    if (insertError) {
      console.error('Erro ao inserir valor padrão:', insertError);
    } else {
      console.log('Valor padrão inserido/atualizado com sucesso.');
    }
  } else {
    console.log('Tabela e valor padrão criados com sucesso.');
  }
}

setupSettings();
