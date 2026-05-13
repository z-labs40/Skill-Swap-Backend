import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

/**
 * Send an SMS using Twilio
 * @param to - Recipient phone number (with country code, e.g., +91...)
 * @param message - The SMS body
 */
export const sendSMS = async (to: string, message: string) => {
  try {
    if (!accountSid || !authToken || !fromNumber) {
      console.warn('Twilio credentials not set. SMS not sent.');
      return { success: false, error: 'Credentials missing' };
    }

    const response = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to
    });

    console.log('SMS sent successfully:', response.sid);
    return { success: true, sid: response.sid };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error };
  }
};

export default sendSMS;
