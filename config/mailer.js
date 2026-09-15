const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendMail({ to, subject, html, text }) {
  if (process.env.DEV_MODE === 'true') {
    console.log(`\n📧 [DEV MODE] Email → ${to}\nSubject: ${subject}\n${text || html}\n`);
    return { dev: true };
  }
  return transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, html, text });
}

module.exports = { sendMail };