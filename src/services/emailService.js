const nodemailer = require('nodemailer');
const environment = require('../config/environment');

const transporter = nodemailer.createTransport({
  host: environment.EMAIL_HOST,
  port: environment.EMAIL_PORT,
  secure: false, // true for 465, false for 587
  auth: {
    user: environment.EMAIL_USER,
    pass: environment.EMAIL_PASS,
  },
});

const sendOTP = async (to, otp, purpose) => {
  const subject = purpose === 'signup' ? 'Verify your email – Story Go' : 'Login OTP – Story Go';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #8b5cf6;">🔐 Your OTP Code</h2>
      <p>Use the following code to ${purpose === 'signup' ? 'complete your registration' : 'log in to your account'}:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; background: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px;">
        ${otp}
      </div>
      <p>This code expires in 5 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <hr />
      <p style="color: #6b7280; font-size: 12px;">Story Go – Audio Stories Platform</p>
    </div>
  `;

  await transporter.sendMail({
    from: environment.EMAIL_FROM,
    to,
    subject,
    html,
  });
};

module.exports = { sendOTP };
