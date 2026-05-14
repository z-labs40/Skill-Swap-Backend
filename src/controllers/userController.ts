import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { encryptMessage, encryptBuffer } from '../utils/crypto';
import cloudinary from '../config/cloudinary';

export const getUserStats = async (req: Request, res: Response) => {
  try {
    // 1. Get total users count
    const { count: totalCount, error: totalError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // 2. Get counts by status
    const { data: statusData, error: statusError } = await supabaseAdmin
      .from('profiles')
      .select('status');

    if (totalError || statusError) throw totalError || statusError;

    // Calculate stats efficiently - strictly for regular users
    const filteredProfiles = statusData?.filter((u: any) => u.role !== 'admin') || [];
    
    const stats = {
      total: filteredProfiles.length || 0,
      active: filteredProfiles.filter(u => u.status === 'active').length || 0,
      suspended: filteredProfiles.filter(u => u.status === 'suspended').length || 0,
      deleted: filteredProfiles.filter(u => u.status === 'deleted').length || 0,
      reported: filteredProfiles.filter((u: any) => u.reports > 0).length || 0,
      topRated: filteredProfiles.filter((u: any) => u.rating >= 4.5).length || 0,
      appeals: filteredProfiles.filter((u: any) => u.appeal_status === 'pending').length || 0
    };

    res.status(200).json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .neq('role', 'admin');

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};


export const updateUserStatus = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { status } = req.body;
  
  if (!['active', 'suspended', 'deleted'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    // Update status to 'active', 'suspended', or 'deleted' (soft delete)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ status })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, message: 'User status updated', data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const hardDeleteUser = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  console.log('Backend: Hard Delete requested for user ID:', id);
  try {
    // 0. Manual Cascade: Delete related records to avoid Foreign Key constraints
    console.log('Backend: Deleting related records for user:', id);
    
    // Delete swap requests
    await supabaseAdmin
      .from('swap_requests')
      .delete()
      .or(`sender_id.eq.${id},receiver_id.eq.${id}`);
      
    // Delete messages
    await supabaseAdmin
      .from('messages')
      .delete()
      .or(`sender_id.eq.${id},receiver_id.eq.${id}`);

    // Delete notifications (if table exists)
    try {
      await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', id);
    } catch (e) {}

    // 1. Delete from Supabase Auth
    try {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (authError) {
        console.warn('Supabase Auth Delete Warning (User might not exist in Auth):', authError.message);
      } else {
        console.log('Supabase Auth: User deleted successfully');
      }
    } catch (authErr) {
      console.warn('Supabase Auth Delete Exception:', authErr);
    }
    
    // 2. Delete from profiles table
    const { data, error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id)
      .select();

    if (profileError) {
      console.error('Database Profile Delete Error:', profileError);
      throw profileError;
    }

    if (!data || data.length === 0) {
      console.warn('Database Profile Delete: No profile found with ID:', id);
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    console.log('Database Profile: User deleted successfully from profiles table');
    res.status(200).json({ success: true, message: 'User permanently deleted from database' });
  } catch (error: any) {
    console.error('Hard Delete Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const uploadAvatar = async (req: Request, res: Response) => {
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
          folder: 'avatars',
          resource_type: 'raw',
          public_id: `avatar-${Date.now()}`
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
        url: result.secure_url,
        isEncrypted: true
      } 
    });
  } catch (error: any) {
    console.error('Avatar Upload Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
export const getUserProfileStats = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('rating')
      .eq('id', id)
      .single();

    if (profileError) throw profileError;

    const { count: swapCount, error: swapError } = await supabaseAdmin
      .from('swap_requests')
      .select('*', { count: 'exact', head: true })
      .or(`sender_id.eq.${id},receiver_id.eq.${id}`)
      .eq('status', 'accepted');

    const stats = {
      swaps: swapCount || 0,
      rating: profile?.rating || 0
    };

    res.status(200).json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get users who have sent messages to this user (Incoming Requests)
 */
export const getIncomingRequests = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Get pending requests from swap_requests table
    const { data: requests_raw, error: reqError } = await supabaseAdmin
      .from('swap_requests')
      .select('id, sender_id, skill, created_at')
      .eq('receiver_id', id)
      .eq('status', 'pending');

    if (reqError) throw reqError;

    if (!requests_raw || requests_raw.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const senderIds = requests_raw.map((r: any) => r.sender_id);

    if (senderIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Fetch profiles for those senders
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, avatar_url, offers, seeks, rating')
      .in('id', senderIds);

    if (profileError) throw profileError;

    const requests = (profiles || []).map((p: any) => {
      const req = requests_raw.find((r: any) => r.sender_id === p.id);
      return {
        id: req?.id || p.id,
        sender_id: p.id,
        name: p.name,
        avatarUrl: p.avatar_url,
        skill: req?.skill || p.seeks?.[0] || 'Various Skills',
        offer: p.offers?.[0] || 'Various Skills',
        rating: p.rating || 0,
        createdAt: req?.created_at
      };
    });

    res.status(200).json({ success: true, data: requests });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get users this user has sent messages to (Sent Requests)
 */
export const getSentRequests = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data: requests_raw, error: reqError } = await supabaseAdmin
      .from('swap_requests')
      .select('id, receiver_id, skill, status, created_at')
      .eq('sender_id', id);

    if (reqError) throw reqError;

    if (!requests_raw || requests_raw.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const receiverIds = requests_raw.map((r: any) => r.receiver_id);

    if (receiverIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, avatar_url, offers, seeks, rating')
      .in('id', receiverIds);

    if (profileError) throw profileError;

    const sent = (profiles || []).map((p: any) => {
      const req = requests_raw.find((r: any) => r.receiver_id === p.id);
      return {
        id: req?.id || p.id,
        receiver_id: p.id,
        name: p.name,
        avatarUrl: p.avatar_url,
        skill: req?.skill || p.seeks?.[0] || 'Various Skills',
        status: req?.status || 'Pending',
        createdAt: req?.created_at
      };
    });

    res.status(200).json({ success: true, data: sent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};


