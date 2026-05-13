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
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_USER;

    if (!apiKey || !senderEmail) {
      const missing = [];
      if (!apiKey) missing.push('BREVO_API_KEY');
      if (!senderEmail) missing.push('BREVO_USER');
      console.error('[EmailService] Missing required environment variables:', missing.join(', '));
      return { success: false, error: `Missing environment variables: ${missing.join(', ')}` };
    }

    console.log('[EmailService] Attempting to send email via Brevo HTTP API to:', to);
    console.log('[EmailService] Using sender:', senderEmail);

    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'SkillBridge Support', email: senderEmail },
        to: [{ email: to }],
        subject: subject,
        textContent: text,
        htmlContent: html || text,
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[EmailService] Email sent successfully via API. ID:', response.data.messageId);
    return { success: true, messageId: response.data.messageId };
  } catch (error: any) {
    const errorData = error.response?.data;
    console.error('[EmailService] Brevo API Error:', errorData || error.message);
    
    if (errorData?.code === 'unauthorized') {
      console.error('[EmailService] TIP: Ensure you are using a v3 API Key (starts with xkeysib-) and not an SMTP password.');
    }
    
    return { success: false, error: errorData?.message || error.message || 'Unknown email error' };
  }
};

export default sendEmail;
