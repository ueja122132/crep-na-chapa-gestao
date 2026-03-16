import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function verify() {
  console.log('--- Verification after Browser Migration ---');
  
  const { data: orgs, error: orgsError } = await supabase.from('organizations').select('*').limit(1);
  if (orgsError) {
    console.error('Error fetching organizations:', orgsError.message);
  } else if (orgs && orgs.length > 0) {
    const columns = Object.keys(orgs[0]);
    console.log('Columns in organizations:', columns.join(', '));
    if (columns.includes('status') && columns.includes('plan')) {
      console.log('SUCCESS: status and plan columns exist.');
    } else {
      console.log('FAILURE: Missing columns.');
    }
  }

  const { data: viewData, error: viewError } = await supabase.from('admin_organization_stats').select('*').limit(1);
  if (viewError) {
    console.log('View "admin_organization_stats" error (expected if not created):', viewError.message);
  } else {
    console.log('SUCCESS: View "admin_organization_stats" exists and is accessible.');
  }
}

verify();
