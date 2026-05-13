import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { encryptMessage, decryptMessage, encryptBuffer } from '../utils/crypto';
import cloudinary from '../config/cloudinary';

export const getMessages = async (req: Request, res: Response) => {
  const { userId, otherId } = req.params;

  try {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    const conversation = data.map(m => {
      // Decrypt message before sending to client
      try {
        return {
          ...m,
          senderId: m.sender_id,
          receiverId: m.receiver_id,
          message: decryptMessage(m.message)
        };
      } catch (e) {
        return {
          ...m,
          senderId: m.sender_id,
          receiverId: m.receiver_id
        };
      }
    });

    res.json({ success: true, data: conversation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  const { senderId, receiverId, message, type = 'text', fileUrl } = req.body;

  if (!senderId || !receiverId || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    // Encrypt the message before saving
    const encryptedText = encryptMessage(message);

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert([
        {
          id: `msg-${Date.now()}`,
          sender_id: senderId,
          receiver_id: receiverId,
          message: encryptedText,
          type,
          file_url: fileUrl
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Return the decrypted message to the sender
    res.json({
      success: true,
      data: {
        ...data,
        senderId: data.sender_id,
        receiverId: data.receiver_id,
        message
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getConversations = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    // 1. Get all messages for this user to identify partners and last messages
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('messages')
      .select('sender_id, receiver_id, message, timestamp')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('timestamp', { ascending: false });

    if (msgError) throw msgError;

    const conversationsMap = new Map();
    messages.forEach(m => {
      const partnerId = m.sender_id === userId ? m.receiver_id : m.sender_id;
      // Since we ordered by timestamp desc, the first time we see a partner is their latest message
      if (!conversationsMap.has(partnerId)) {
        let decodedMsg = 'File';
        try {
          decodedMsg = decryptMessage(m.message);
        } catch (e) {
          decodedMsg = 'Encrypted message';
        }
        conversationsMap.set(partnerId, {
          lastMessage: decodedMsg,
          lastTimestamp: m.timestamp
        });
      }
    });

    const partnerIds = Array.from(conversationsMap.keys());
    if (partnerIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // 2. Fetch profile details for all unique partners
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .in('id', partnerIds);

    if (profileError) throw profileError;

    // 3. Merge profiles with last message data
    const mergedData = profiles.map(profile => {
      const chatInfo = conversationsMap.get(profile.id);
      return {
        ...profile,
        lastMessage: chatInfo?.lastMessage,
        lastTimestamp: chatInfo?.lastTimestamp
      };
    });

    res.json({ success: true, data: mergedData });
  } catch (error: any) {
    console.error('getConversations Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const uploadFile = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  try {
    // 1. Encrypt the file buffer
    const encryptedBuffer = encryptBuffer(req.file.buffer);

    // 2. Upload the encrypted buffer to Cloudinary as 'raw' resource
    const result: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'chat_uploads',
          resource_type: 'raw', // Critical: Cloudinary won't recognize encrypted bytes as images
          public_id: `${Date.now()}-${req.file?.originalname.replace(/\.[^/.]+$/, "")}`
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(encryptedBuffer);
    });

    res.json({
      success: true,
      data: {
        fileUrl: result.secure_url,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        isEncrypted: true // Flag for frontend to know it needs decryption
      }
    });
  } catch (error: any) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


export const deleteMessage = async (req: Request, res: Response) => {
  const { messageId } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;

    res.json({ success: true, message: 'Message deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const editMessage = async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { newMessage } = req.body;

  if (!newMessage) {
    return res.status(400).json({ success: false, error: 'New message content is required' });
  }

  try {
    const encryptedText = encryptMessage(newMessage);

    const { data, error } = await supabaseAdmin
      .from('messages')
      .update({ message: encryptedText, is_edited: true })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: {
        ...data,
        senderId: data.sender_id,
        receiverId: data.receiver_id,
        message: newMessage
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteConversation = async (req: Request, res: Response) => {
  const { userId, otherId } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`);

    if (error) throw error;

    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
