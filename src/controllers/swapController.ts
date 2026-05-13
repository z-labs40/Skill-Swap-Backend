import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { encryptMessage } from '../utils/crypto';

export const createRequest = async (req: Request, res: Response) => {
  const { senderId, receiverId, skill } = req.body;

  if (!senderId || !receiverId) {
    return res.status(400).json({ success: false, message: 'Missing sender or receiver ID' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('swap_requests')
      .insert([
        {
          id: `req-${Date.now()}`,
          sender_id: senderId,
          receiver_id: receiverId,
          skill: skill || 'Various Skills',
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const acceptRequest = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // 1. Update request status
    const { data: request, error: updateError } = await supabaseAdmin
      .from('swap_requests')
      .update({ status: 'accepted' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Fetch profiles to get names for the confirmation message
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name')
      .in('id', [request.sender_id, request.receiver_id]);

    if (profileError) throw profileError;

    const sender = profiles?.find(p => p.id === request.sender_id);
    const receiver = profiles?.find(p => p.id === request.receiver_id);

    // 3. Send automated confirmation messages
    await supabaseAdmin.from('messages').insert([
      {
        id: `msg-sys-1-${Date.now()}`,
        sender_id: request.receiver_id, // Appears as coming from receiver
        receiver_id: request.sender_id,
        message: encryptMessage(`Your swap request with ${receiver?.name || 'Partner'} was accepted!`),
        type: 'text'
      },
      {
        id: `msg-sys-2-${Date.now()}`,
        sender_id: request.sender_id, // Appears as coming from sender
        receiver_id: request.receiver_id,
        message: encryptMessage(`You accepted the swap request from ${sender?.name || 'Partner'}!`),
        type: 'text'
      }
    ]);

    res.status(200).json({ success: true, message: 'Request accepted', data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const rejectRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin
      .from('swap_requests')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ success: true, message: 'Request rejected' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
