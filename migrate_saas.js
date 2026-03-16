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
-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert a default organization for the current user
INSERT INTO public.organizations (name, slug) 
VALUES ('Crep na Chapa', 'crep-na-chapa')
ON CONFLICT (slug) DO NOTHING;

-- Add organization_id to orders
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='orders' AND COLUMN_NAME='organization_id') THEN
        ALTER TABLE public.orders ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    END IF;
END $$;

-- Add organization_id to order_items
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='order_items' AND COLUMN_NAME='organization_id') THEN
        ALTER TABLE public.order_items ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    END IF;
END $$;

-- Create products table for SaaS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('crepe', 'churrasco')),
    price DECIMAL(10,2) NOT NULL,
    ingredients TEXT[] DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Update existing orders to point to the default organization
UPDATE public.orders 
SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'crep-na-chapa')
WHERE organization_id IS NULL;

UPDATE public.order_items 
SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'crep-na-chapa')
WHERE organization_id IS NULL;
`;

async function run() {
  const client = new Client(clientConfig);
  try {
    console.log('Tentando conectar ao banco de dados...');
    await client.connect();
    console.log('Conectado ao Postgres do Supabase.');
    await client.query(sql);
    console.log('Migração SaaS aplicada com sucesso!');
  } catch (err) {
    console.error('Erro ao executar SQL:', err.message);
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

run();
