const nodemailer = require('nodemailer');
const dns = require('dns');
const environment = require('../config/environment');

const transporter = nodemailer.createTransport({
  host: environment.EMAIL_HOST,
  port: environment.EMAIL_PORT,
  secure: false,
  auth: {
    user: environment.EMAIL_USER,
    pass: environment.EMAIL_PASS,
  },
  lookup: (hostname, options, callback) => {
    dns.lookup(hostname, { family: 4 }, callback);
  },
});

const LOGO_URL = environment.EMAIL_LOGO_URL || '';

const sendOTP = async (to, otp, purpose) => {
  const subject = purpose === 'signup' ? 'Verify your email – Story Go' : 'Login OTP – Story Go';
  const actionText = purpose === 'signup' ? 'creating your account' : 'logging in';

  const logoHtml = LOGO_URL
    ? `<img src="${LOGO_URL}" alt="Story Go" style="height: 48px; margin-bottom: 16px;" />`
    : `<h2 style="color: #a78bfa; margin: 0;">📖 Story Go</h2>`;

  const html = `...`; // Keep your full HTML template – unchanged.

  try {
    const info = await transporter.sendMail({
      from: environment.EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent successfully to ${to} - Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`❌ Email send failed to ${to}: ${error.message}`);
    throw error;
  }
};

module.exports = { sendOTP };
