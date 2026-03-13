import pg from 'pg';
const { Client } = pg;

const clientConfig = {
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.djzccjezfnxmxvrhhzvb',
  password: '2ZUVPZSsnxcqrdD9',
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 15000,
};

const sql = `
CREATE TABLE IF NOT EXISTS products (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  ingredients JSONB
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  status TEXT DEFAULT 'pending',
  total_price DOUBLE PRECISION NOT NULL,
  customer_name TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  amount_received DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT,
  product_name TEXT,
  product_type TEXT,
  price DOUBLE PRECISION,
  customizations JSONB
);
`;

async function run() {
  const client = new Client(clientConfig);
  try {
    console.log('Tentando conectar ao banco de dados via Pooler...');
    await client.connect();
    console.log('Conectado ao Postgres do Supabase via Pooler.');
    await client.query(sql);
    console.log('Tabelas criadas com sucesso!');
  } catch (err) {
    console.error('Erro ao executar SQL:', err.message);
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

run();
