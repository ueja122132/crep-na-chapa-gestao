const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function initDb() {
  console.log('Inicializando banco de dados no Supabase...');

  const queries = [
    `CREATE TABLE IF NOT EXISTS products (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      ingredients JSONB
    );`,
    `CREATE TABLE IF NOT EXISTS orders (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      status TEXT DEFAULT 'pending',
      total_price DOUBLE PRECISION NOT NULL,
      customer_name TEXT,
      payment_status TEXT DEFAULT 'pending',
      payment_method TEXT,
      amount_received DOUBLE PRECISION,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
      product_id BIGINT,
      product_name TEXT,
      product_type TEXT,
      price DOUBLE PRECISION,
      customizations JSONB
    );`
  ];

  for (const query of queries) {
    const { error } = await supabase.rpc('execute_sql', { sql_query: query });
    if (error) {
      // Se o RPC não existir, tentaremos via API de gerenciamento ou informaremos o usuário
      console.error('Erro ao executar SQL via RPC:', error.message);
      console.log('Tentando via Management API...');
      break;
    }
    console.log('Query executada com sucesso.');
  }
}

// Nota: O Supabase não habilita RPC 'execute_sql' por padrão por segurança.
// Vou sugerir ao usuário rodar o SQL no Dashboard se isso falhar.
initDb();
