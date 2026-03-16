import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkDb() {
  console.log('--- Database Diagnostic ---');
  
  console.log('1. Checking organizations table...');
  const { data: orgs, error: orgsError } = await supabase.from('organizations').select('*').limit(1);
  
  if (orgsError) {
    console.error('Error fetching organizations:', orgsError.message);
  } else if (orgs && orgs.length > 0) {
    const columns = Object.keys(orgs[0]);
    console.log('Found columns in organizations:', columns.join(', '));
    
    const missing = ['status', 'plan'].filter(col => !columns.includes(col));
    if (missing.length > 0) {
       console.error('CRITICAL: Missing columns in organizations:', missing.join(', '));
    } else {
       console.log('SUCCESS: All required columns exist in organizations.');
    }
  } else {
    console.log('No organizations found to inspect.');
  }

  console.log('\n2. Checking user_profiles table...');
  const { data: profiles, error: profileError } = await supabase.from('user_profiles').select('*').limit(1);
  if (profileError) {
    console.error('Error fetching profiles:', profileError.message);
  } else if (profiles && profiles.length > 0) {
    const columns = Object.keys(profiles[0]);
    console.log('Found columns in user_profiles:', columns.join(', '));
    if (!columns.includes('role')) {
      console.error('CRITICAL: Missing "role" column in user_profiles.');
    } else {
      console.log('SUCCESS: "role" column exists.');
    }
  }

  console.log('\n--- End of Diagnostic ---');
}

checkDb();
