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
-- Adicionar owner_id se não existir
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Opcional: Popular owner_id a partir do owner_email se houver correspondência exata
-- (Pularemos por segurança e deixaremos o sistema popular no próximo upgrade)

-- Garantir permissões de RLS para o SuperAdmin e Dono
DROP POLICY IF EXISTS "Allow ALL operations on orgs" ON public.organizations;
CREATE POLICY "Allow ALL operations on orgs" ON public.organizations
FOR ALL USING (true) WITH CHECK (true);

-- Garantir que a tabela saas_subscriptions também tenha owner_id se necessário
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='saas_subscriptions' AND COLUMN_NAME='owner_id') THEN
        ALTER TABLE public.saas_subscriptions ADD COLUMN owner_id UUID REFERENCES auth.users(id);
    END IF;
END $$;
`;

async function run() {
  const client = new Client(clientConfig);
  try {
    console.log('Conectando ao Postgres...');
    await client.connect();
    console.log('Executando correção de colunas...');
    await client.query(sql);
    console.log('Banco de dados corrigido com sucesso!');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await client.end();
  }
}

run();
