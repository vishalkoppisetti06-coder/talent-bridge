const twilio = require('twilio');
let client = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function sendSms(to, body) {
  if (process.env.DEV_MODE === 'true') {
    console.log(`\n📱 [DEV MODE] SMS → ${to}\n${body}\n`);
    return { dev: true };
  }
  if (!client) throw new Error('Twilio credentials missing. Set TWILIO_* in .env');
  return client.messages.create({ from: process.env.TWILIO_PHONE_NUMBER, to, body });
}

module.exports = { sendSms };