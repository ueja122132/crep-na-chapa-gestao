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
CREATE OR REPLACE FUNCTION upgrade_org_plan(
  p_org_id UUID,
  p_plan TEXT,
  p_payment_status TEXT,
  p_subscription_expires_at TIMESTAMPTZ,
  p_status TEXT
) RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  UPDATE organizations
  SET 
    plan = p_plan,
    payment_status = p_payment_status,
    subscription_expires_at = p_subscription_expires_at,
    status = p_status,
    updated_at = NOW()
  WHERE id = p_org_id;
  
  IF FOUND THEN
    v_result := '{"success": true}';
  ELSE
    v_result := '{"success": false, "error": "Organization not found"}';
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function run() {
  const client = new Client(clientConfig);
  try {
    console.log('Tentando conectar ao banco de dados via Pooler...');
    await client.connect();
    console.log('Conectado ao Postgres do Supabase via Pooler.');
    await client.query(sql);
    console.log('RPC update_plan criada com sucesso!');
  } catch (err) {
    console.error('Erro ao executar SQL:', err.message);
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

run();
