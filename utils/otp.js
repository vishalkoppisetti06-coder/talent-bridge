const crypto = require('crypto');
const Otp = require('../models/Otp');
const { sendOtpEmail } = require('./email');
const { sendSms } = require('./sms');

function generateOtp() { return String(crypto.randomInt(100000, 999999)); }

async function issueOtp({ identifier, channel, purpose = 'reset-password' }) {
  await Otp.updateMany({ identifier, purpose, consumed: false }, { consumed: true });
  const otp = generateOtp();
  await Otp.create({
    identifier, channel, otp, purpose,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  if (channel === 'email') await sendOtpEmail(identifier, otp, 'Password Reset');
  else await sendSms(identifier, `Talent Bridge OTP: ${otp}. Valid 10 min. Do not share.`);
  return otp;
}

module.exports = { generateOtp, issueOtp };