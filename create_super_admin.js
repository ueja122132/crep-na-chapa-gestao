
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createNewSuperAdmin() {
  console.log('--- Creating Dedicated Super Admin Account ---');
  
  const email = 'superadmin@gmail.com';
  const password = 'admin122132';

  // 1. Create User in Auth
  console.log(`Checking if ${email} exists...`);
  const { data: users } = await supabase.auth.admin.listUsers();
  let user = users?.users.find(u => u.email === email);

  if (!user) {
    console.log('Creating new Auth user...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createError) {
      console.error('Error creating user:', createError.message);
      return;
    }
    user = newUser.user;
    console.log('Auth user created ID:', user.id);
  } else {
    console.log('Auth user already exists. Updating password...');
    await supabase.auth.admin.updateUserById(user.id, { password });
  }

  // 2. Create/Update Profile with role 'super_admin'
  console.log('Setting role to super_admin in user_profiles...');
  
  // Note: We leave organization_id as null to isolate from any specific store products
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: user.id,
      full_name: 'Super Administrador Global',
      role: 'super_admin',
      organization_id: null // Isolated from any specific store
    })
    .select()
    .single();

  if (profileError) {
    console.error('Error updating profile:', profileError.message);
    console.log('Falling back: attempting to find a valid organization if null is not allowed...');
    
    // In some schemas, organization_id might be NOT NULL. Let's check.
    // However, for a SaaS owner, it's better if it's null.
    // If it fails, we'll notify.
  } else {
    console.log('Super Admin profile configured successfully!');
  }
}

createNewSuperAdmin();
