import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail', // Let nodemailer handle the host/port/secure logic for Gmail
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  // Adding timeout settings to prevent hanging
  connectionTimeout: 10000, 
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

// Verify connection configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server is ready to take our messages');
  }
});

/**
 * Send an email using Nodemailer
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param text - Plain text body
 * @param html - HTML body (optional)
 */
export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
  try {
    console.log(`[EmailService] Attempting to send email to: ${to}`);
    const info = await transporter.sendMail({
      from: `"SkillBridge Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || text,
    });

    console.log('[EmailService] Email sent successfully. MessageId:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('[EmailService] Nodemailer Error:', error.message || error);
    if (error.code === 'EAUTH') {
      console.error('[EmailService] Authentication failed. Check your EMAIL_USER and EMAIL_PASSWORD (App Password).');
    }
    return { success: false, error: error.message || 'Unknown email error' };
  }
};

export default sendEmail;
