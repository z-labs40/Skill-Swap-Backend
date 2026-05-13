import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

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
    console.log('[EmailService] Attempting to send email via Brevo HTTP API to:', to);

    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'SkillBridge Support', email: process.env.BREVO_USER },
        to: [{ email: to }],
        subject: subject,
        textContent: text,
        htmlContent: html || text,
      },
      {
        headers: {
          'api-key': process.env.BREVO_PASSWORD,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[EmailService] Email sent successfully via API. ID:', response.data.messageId);
    return { success: true, messageId: response.data.messageId };
  } catch (error: any) {
    console.error('[EmailService] Brevo API Error:', error.response?.data || error.message);
    return { success: false, error: error.message || 'Unknown email error' };
  }
};

export default sendEmail;
