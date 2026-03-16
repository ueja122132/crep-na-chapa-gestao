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
  }
};

const sql = `
-- Adicionar coluna role se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='user_profiles' AND COLUMN_NAME='role') THEN
        ALTER TABLE public.user_profiles ADD COLUMN role TEXT DEFAULT 'admin';
    END IF;
END $$;

-- Adicionar planos e status às organizações
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='organizations' AND COLUMN_NAME='plan') THEN
        ALTER TABLE public.organizations ADD COLUMN plan TEXT DEFAULT 'pro';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='organizations' AND COLUMN_NAME='status') THEN
        ALTER TABLE public.organizations ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- Promover o usuário principal a Super Admin
UPDATE public.user_profiles 
SET role = 'super_admin' 
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'admin@crepnachapa.com'
);

-- Garantir que a organização principal seja Pro
UPDATE public.organizations 
SET plan = 'pro' 
WHERE slug = 'crep-na-chapa';

-- Criar view para facilitar as métricas de administrador (Opcional, mas útil)
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
    o.id;
`;

async function run() {
  const client = new Client(clientConfig);
  try {
    console.log('Iniciando migração de Super Admin...');
    await client.connect();
    await client.query(sql);
    console.log('Migração concluída com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err.message);
  } finally {
    await client.end();
  }
}

run();
