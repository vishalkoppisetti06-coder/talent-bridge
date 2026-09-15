const { sendMail } = require('../config/mailer');

async function sendOtpEmail(to, otp, purpose = 'Verification') {
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
      <h2 style="color:#1e3a8a;margin:0 0 8px">Talent Bridge</h2>
      <p style="color:#475569;font-size:14px">Your one-time password for <b>${purpose}</b>:</p>
      <div style="font-size:34px;letter-spacing:10px;font-weight:800;color:#1e3a8a;text-align:center;margin:24px 0;padding:16px;background:#eff6ff;border-radius:10px">${otp}</div>
      <p style="color:#94a3b8;font-size:12px">Valid for 10 minutes. Never share this code.</p>
    </div>`;
  return sendMail({ to, subject: `Talent Bridge — ${purpose} OTP`, html, text: `Your OTP: ${otp}` });
}

module.exports = { sendOtpEmail };