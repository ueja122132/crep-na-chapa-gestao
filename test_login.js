
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testLogin() {
  console.log('--- Testing Admin Login ---');
  const email = 'admin@crepnachapa.com';
  const password = 'admin123';

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('Login Failed:', error.message);
    if (error.message.includes('Email not confirmed')) {
        console.log('Attempting to force confirm user...');
    }
  } else {
    console.log('Login Successful!');
    console.log('User ID:', data.user.id);
    console.log('Session Start:', !!data.session);
  }
}

testLogin();
