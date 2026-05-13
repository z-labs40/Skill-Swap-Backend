import { sendEmail } from '../utils/emailService';
import dotenv from 'dotenv';

dotenv.config();

async function testEmail() {
  console.log('Testing email sending...');
  console.log('Using EMAIL_USER:', process.env.EMAIL_USER);
  
  const result = await sendEmail(
    'karthi.test@example.com', // Change this to a real email if needed, or just see the error
    'Test Email from SkillBridge',
    'This is a test email to verify SMTP settings.'
  );

  console.log('Result:', result);
  if (!result.success) {
    console.error('Email failed:', result.error);
  } else {
    console.log('Email sent successfully!');
  }
}

testEmail();
