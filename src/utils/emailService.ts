import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend('re_aqkS6cXh_9rgoZPzBTyRWLBmyNJHzxmwr');

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
    console.log('[EmailService] Attempting to send email via Resend to:', to);

    const { data, error } = await resend.emails.send({
      from: 'SkillBridge <onboarding@resend.dev>', // Using Resend's default sender for now
      to: [to],
      subject: subject,
      text: text,
      html: html || text,
    });

    if (error) {
      console.error('[EmailService] Resend Error:', error);
      return { success: false, error: error.message };
    }

    console.log('[EmailService] Email sent successfully. ID:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error: any) {
    console.error('[EmailService] Unexpected Error:', error.message || error);
    return { success: false, error: error.message || 'Unknown email error' };
  }
};

export default sendEmail;
