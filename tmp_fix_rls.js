import { createClient } from '@supabase/supabase-js';

const s = createClient('https://djzccjezfnxmxvrhhzvb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqemNjamV6Zm54bXh2cmhoenZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM2MDcyMywiZXhwIjoyMDg4OTM2NzIzfQ.uQYFp1X7-z4fYQI49zpb7Ux9O1pvb4fGMVerpik9wFk');

async function fix() {
  console.log('Applying RLS fixes (ESM)...');
  
  // Create policy allowing updates by owners
  const { data, error } = await s.rpc('exec_sql', {
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE tablename = 'organizations' AND policyname = 'Allow owners update'
        ) THEN
          CREATE POLICY "Allow owners update" ON organizations 
          FOR UPDATE TO authenticated 
          USING (owner_email = auth.jwt() ->> 'email') 
          WITH CHECK (owner_email = auth.jwt() ->> 'email');
        END IF;
      END
      $$;
      
      ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
    `
  });

  if (error) {
    console.error('Error applying policy:', error);
    process.exit(1);
  } else {
    console.log('Policy check/apply successfully.');
    process.exit(0);
  }
}

fix();
