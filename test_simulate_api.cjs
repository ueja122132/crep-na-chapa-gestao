const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const https = require('https');

async function testSimulate() {
  const userId = 'ad52c217-ba21-4e9e-8438-73476cb6986b'; // ajeu@gmail.com
  console.log('Resetting password for testing...');
  await supabase.auth.admin.updateUserById(userId, { password: 'password123' });

  console.log('Logging in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'ajeu@gmail.com',
    password: 'password123'
  });

  if (authError || !authData.session) {
    console.error('Login failed:', authError);
    return;
  }

  const token = authData.session.access_token;
  console.log('Got token. Calling /api/simulate-payment on Railway...');

  const options = {
    hostname: 'crep-na-chapa-gestao-production.up.railway.app',
    port: 443,
    path: '/api/simulate-payment',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': 0
    }
  };

  const req = https.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);
    let body = '';
    res.on('data', d => {
      body += d;
    });
    res.on('end', () => {
      console.log(`Response Body: ${body}`);
      process.exit(0);
    });
  });

  req.on('error', error => {
    console.error('Request error:', error);
    process.exit(1);
  });

  req.end();
}

testSimulate();
