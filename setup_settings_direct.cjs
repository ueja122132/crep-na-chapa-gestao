
const pg = require('pg');
const { Client } = pg;

const clientConfig = {
  host: 'db.djzccjezfnxmxvrhhzvb.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '2ZUVPZSsnxcqrdD9',
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  }
};

const sql = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO settings (key, value)
VALUES ('extra_ingredient_price', '5.00')
ON CONFLICT (key) DO NOTHING;
`;

async function run() {
  const client = new Client(clientConfig);
  try {
    console.log('Tentando conectar ao banco de dados Postgres...');
    await client.connect();
    console.log('Conectado ao Postgres do Supabase.');
    await client.query(sql);
    console.log('Tabela settings e valor padrão configurados com sucesso!');
  } catch (err) {
    console.error('Erro ao executar SQL:', err.message);
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

run();
