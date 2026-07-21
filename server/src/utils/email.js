const nodemailer = require('nodemailer');

let transporter = null;
let initialized = false;

const getTransporter = () => {
  if (initialized) return transporter;
  initialized = true;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    console.log('--- SMTP not configured. Email would have been sent: ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${text || html}`);
    console.log('---------------------------------------------------------');
    return { simulated: true };
  }

  const info = await activeTransporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@crm-report.local',
    to,
    subject,
    html,
    text,
  });

  return info;
};

const sendPasswordResetEmail = async (toEmail, resetLink) => {
  const subject = 'Password Reset Request';
  const text = `You requested a password reset. Use the link below (valid for 30 minutes):\n\n${resetLink}\n\nIf you did not request this, please ignore this email.`;
  const html = `
    <p>You requested a password reset.</p>
    <p><a href="${resetLink}">${resetLink}</a></p>
    <p>This link is valid for 30 minutes. If you did not request this, please ignore this email.</p>
  `;

  return sendEmail({ to: toEmail, subject, html, text });
};

const sendSecurityAlertEmail = async (toEmail, { subject, lines }) => {
  const text = lines.join('\n');
  const html = `<p>${lines.map((l) => String(l)).join('</p><p>')}</p>`;

  try {
    return await sendEmail({ to: toEmail, subject: `[Security] ${subject}`, html, text });
  } catch (err) {
    // Never fail the auth flow because an alert email could not be sent
    console.error('Failed to send security alert email:', err.message);
    return { failed: true };
  }
};

module.exports = { sendEmail, sendPasswordResetEmail, sendSecurityAlertEmail };
