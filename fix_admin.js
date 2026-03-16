
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndFixAdmin() {
  console.log('--- Verifying Admin User ---');
  
  // 1. Get main organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'crep-na-chapa')
    .single();

  if (!org) {
    console.error('Main organization (crep-na-chapa) not found!');
    return;
  }
  console.log('Main Org ID:', org.id);

  // 2. Check if user exists in Auth
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  const adminUser = users?.users.find(u => u.email === 'admin@crepnachapa.com');

  if (!adminUser) {
    console.log('Admin user not found. Creating...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'admin@crepnachapa.com',
      password: 'admin123',
      email_confirm: true
    });
    
    if (createError) {
      console.error('Error creating user:', createError.message);
      return;
    }
    
    console.log('User created:', newUser.user.id);
    
    // Create profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([{
        id: newUser.user.id,
        organization_id: org.id,
        full_name: 'Administrador Crep'
      }]);
      
    if (profileError) console.error('Error creating profile:', profileError.message);
    else console.log('Profile created successfully.');
  } else {
    console.log('Admin user already exists. ID:', adminUser.id);
    
    // Ensure profile exists
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', adminUser.id)
      .single();
      
    if (!profile) {
      console.log('Profile missing. Creating...');
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([{
          id: adminUser.id,
          organization_id: org.id,
          full_name: 'Administrador Crep'
        }]);
      if (profileError) console.error('Error creating profile:', profileError.message);
      else console.log('Profile fixed.');
    } else {
      console.log('Profile OK.');
    }
    
    // Reset password to admin123 just in case
    await supabase.auth.admin.updateUserById(adminUser.id, { password: 'admin123' });
    console.log('Password updated to admin123.');
  }
}

checkAndFixAdmin();
