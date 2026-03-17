const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch('https://crep-na-chapa-gestao-production.up.railway.app/api/simulate-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Body: ${text}`);
  } catch (e) {
    console.error(e);
  }
}
test();
