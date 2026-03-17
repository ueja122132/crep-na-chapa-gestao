const https = require('https');

const options = {
  hostname: 'crep-na-chapa-gestao-production.up.railway.app',
  port: 443,
  path: '/api/simulate-payment',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': 0
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.end();
