import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'skill-bridge-secret-key';

const encrypt = (text: string) => {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

const decrypt = (ciphertext: string) => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText || ciphertext;
  } catch (e) {
    return ciphertext;
  }
};

export const getAllMessages = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;

    // Decrypt messages
    const decryptedData = data.map((msg: any) => ({
      ...msg,
      message: decrypt(msg.message)
    }));

    res.status(200).json({ success: true, data: decryptedData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { userEmail, message } = req.body;
    
    if (!userEmail || !message) {
      return res.status(400).json({ success: false, message: 'Email and Message are required' });
    }

    const { data, error } = await supabase
      .from('support_messages')
      .insert([
        {
          id: Date.now().toString(),
          user_email: userEmail,
          message: encrypt(message),
          status: 'pending',
          timestamp: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;

    // --- AI Auto-Reply Integration ---
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const prompt = `You are the SkillBridge Support AI. A user said: "${message}". 
        Give a very short, friendly 1-sentence reply (max 20 words).`;
        
        const result = await model.generateContent(prompt);
        const aiReply = result.response.text();
        
        if (aiReply) {
          await supabase.from('support_messages').insert([{
            id: `ai_${Date.now()}`,
            user_email: userEmail,
            message: encrypt(aiReply.trim()),
            status: 'replied',
            timestamp: new Date().toISOString()
          }]);
        }
      } catch (aiErr) {
        console.error('AI Support Reply Error:', aiErr);
      }
    } else {
      console.warn('GEMINI_API_KEY is missing in backend .env');
    }
    // ----------------------------------

    res.status(201).json({ success: true, message: 'Support message sent', data: data[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const replyToMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Original message ID
    const { reply } = req.body;

    if (!reply) {
      return res.status(400).json({ success: false, message: 'Reply content is required' });
    }

    // 1. Fetch original message to get user_email
    const { data: original, error: fetchError } = await supabase
      .from('support_messages')
      .select('user_email')
      .eq('id', id)
      .single();

    if (fetchError || !original) {
      return res.status(404).json({ success: false, message: 'Original message not found' });
    }

    // 2. Insert a NEW message as a reply using 'status' to identify it
    const { data, error } = await supabase
      .from('support_messages')
      .insert([
        {
          id: `reply_${Date.now()}`,
          user_email: original.user_email,
          message: encrypt(reply),
          status: 'replied', // Use this status to identify admin replies
          timestamp: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;

    // 3. Mark original message as replied
    await supabase.from('support_messages').update({ status: 'replied' }).eq('id', id);

    res.status(200).json({ success: true, message: 'Reply sent as a new message', data: data[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const { data, error } = await supabase
      .from('support_messages')
      .update({ message })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.status(200).json({ success: true, message: 'Message updated', data: data[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // WhatsApp style: Instead of deleting, update to "unsent" placeholder
    const { data, error } = await supabase
      .from('support_messages')
      .update({ 
        message: '🚫 This message was unsent',
        status: 'unsent'
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.status(200).json({ success: true, message: 'Message unsent', data: data[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const permanentlyDeleteMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('support_messages')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ success: true, message: 'Message permanently deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
