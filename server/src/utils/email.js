import nodemailer from 'nodemailer';
export async function sendOtpEmail(to, code, purpose) {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) throw new Error('Email service is not configured. Set SMTP_USER and SMTP_PASS in server/.env.');
  const transporter = nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT || 465), secure: String(SMTP_SECURE ?? 'true') === 'true', auth: { user: SMTP_USER, pass: SMTP_PASS } });
  const subject = purpose === 'verify-email' ? 'Verify your Beato Flores account' : 'Reset your Beato Flores password';
  const explanation = purpose === 'verify-email' ? 'Use this code to verify your email address.' : 'Use this code to reset your password.';
  await transporter.sendMail({ from: MAIL_FROM || SMTP_USER, to, subject, text: `${explanation}\n\nYour verification code is: ${code}\nThis code expires in 5 minutes and can only be used once. If you did not request this, you can ignore this email.`, html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;color:#222"><h2 style="color:#52664b">Beato Flores</h2><p>${explanation}</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:18px;background:#f3f0e8;text-align:center;border-radius:10px">${code}</div><p>This code expires in <b>5 minutes</b> and can only be used once.</p><p style="color:#777;font-size:12px">If you did not request this, ignore this email.</p></div>` });
}
