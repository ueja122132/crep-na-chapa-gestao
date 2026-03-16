import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

// Extraindo o host do endpoint REST para o formato Postgres se necessário
// SUPABASE_URL: https://djzccjezfnxmxvrhhzvb.supabase.co
// Postgres Host: aws-0-sa-east-1.pooler.supabase.com (obtido do console anteriormente)

const clientConfig = {
  host: 'db.djzccjezfnxmxvrhhzvb.supabase.co',
  port: 6543,
  user: 'postgres.djzccjezfnxmxvrhhzvb',
  password: '2ZUVPZSsnxcqrdD9',
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000
};

const sql = `
-- Adicionar colunas na schema public
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'pro';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Criar view de estatísticas para o admin
CREATE OR REPLACE VIEW public.admin_organization_stats AS
SELECT 
    o.id,
    o.name,
    o.slug,
    o.plan,
    o.status,
    o.created_at,
    COUNT(ord.id) as total_orders,
    COALESCE(SUM(ord.total_price), 0) as total_sales
FROM 
    public.organizations o
LEFT JOIN 
    public.orders ord ON o.id = ord.organization_id AND ord.payment_status = 'paid'
GROUP BY 
    o.id, o.name, o.slug, o.plan, o.status, o.created_at;
`;

async function run() {
  const client = new Client(clientConfig);
  try {
    console.log('Conectando ao banco...');
    await client.connect();
    console.log('Aplicando DDL...');
    await client.query(sql);
    console.log('DDL aplicado com sucesso!');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await client.end();
  }
}

run();
