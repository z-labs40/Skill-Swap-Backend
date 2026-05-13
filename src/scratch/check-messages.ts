import { supabaseAdmin } from '../src/config/supabase';
import { decryptMessage } from '../src/utils/crypto';
import dotenv from 'dotenv';

dotenv.config();

async function checkMessages() {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching messages:', error);
    return;
  }

  console.log('Last 10 messages:');
  data.forEach(m => {
    try {
      console.log(`ID: ${m.id}, From: ${m.sender_id}, To: ${m.receiver_id}, Message: ${decryptMessage(m.message)}`);
    } catch (e) {
      console.log(`ID: ${m.id}, From: ${m.sender_id}, To: ${m.receiver_id}, Message (Encrypted): ${m.message}`);
    }
  });
}

checkMessages();
