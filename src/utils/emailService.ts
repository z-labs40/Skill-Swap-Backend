import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASSWORD, // SMTP Key from Brevo
  },
});

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<EmailResponse> => {
  try {
    console.log('[EmailService] Attempting to send email via Brevo to:', to);

    const info = await transporter.sendMail({
      from: `"SkillBridge Support" <${process.env.BREVO_USER}>`,
      to,
      subject,
      text,
      html: html || text,
    });

    console.log('[EmailService] Email sent successfully. MessageId:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('[EmailService] Brevo SMTP Error:', error.message || error);
    return { success: false, error: error.message || 'Unknown email error' };
  }
};

export default sendEmail;
