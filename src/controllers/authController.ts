import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { sendEmail } from '../utils/emailService';

export const register = async (req: Request, res: Response) => {
  const { name, email, password, dob, phone } = req.body;

  try {
    console.log(`[Register] Start registration for email: ${email}`);
    // 0. Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;
    const existingUser = (existingUsers?.users as any[]).find(u => u.email === email);
    
    if (existingUser) {
      // Always delete existing user (verified or not) to allow fresh registration for testing
      console.log(`[Register] User ${email} exists. Deleting to allow fresh registration as requested...`);
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      await supabaseAdmin.from('profiles').delete().eq('id', existingUser.id);
    }

    // 1. Create user via Supabase Admin (email_confirm: false)
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { name, dob, phone }
    });
    if (adminError) throw adminError;
    const userId = adminData?.user?.id;
    if (!userId) throw new Error('User ID not returned from admin creation');

    // 2. Generate and store OTP in database
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: otpError } = await supabaseAdmin
      .from('otps')
      .upsert([{ email, otp, expires_at: expiresAt }]);
    
    if (otpError) {
      console.error('OTP DB Error:', otpError);
      throw new Error('Failed to save OTP to database');
    }

    // 3. Send OTP Email
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #7c3aed; text-align: center;">Verify Your Email</h2>
        <p>Hi <b>${name}</b>,</p>
        <p>Thank you for signing up for SkillBridge. Please use the following OTP to verify your email address:</p>
        <div style="background: #f8f7ff; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #7c3aed; text-align: center;">
          <h1 style="margin: 0; color: #7c3aed; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p style="font-size: 12px; color: #666;">This OTP is valid for 10 minutes.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
        <p style="font-size: 11px; color: #aaa; text-align: center;">SkillBridge Platform &bull; 2026</p>
      </div>
    `;

    // 3. Send OTP Email (in background to prevent frontend timeout)
    console.log(`[DEBUG] OTP for ${email} is: ${otp}`);
    sendEmail(
      email,
      'Verify Your SkillBridge Account',
      `Your OTP is: ${otp}`,
      htmlContent
    ).catch(err => console.error(`[Register] Background Email Error for ${email}:`, err));

    console.log(`[Register] Registration initiated for ${email}`);

    res.status(201).json({ 
      success: true, 
      message: 'Registration initiated. OTP will be sent to your email.', 
      user: { id: userId, email } 
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const verifyRegistrationOtp = async (req: Request, res: Response) => {
  const { email, otp, password } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  try {
    // 1. Check OTP in database
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('otps')
      .select('*')
      .eq('email', email)
      .single();

    if (otpError || !otpData) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    if (new Date() > new Date(otpData.expires_at)) {
      await supabaseAdmin.from('otps').delete().eq('email', email);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please sign up again.' });
    }

    if (otpData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // 2. Find User in Auth
    const { data: authList, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError || !authList) throw new Error('User not found');
    const authUser = (authList.users as any[]).find((u: any) => u.email === email);
    if (!authUser) throw new Error('User not found');

    const userId = authUser.id;
    const { name, dob, phone } = authUser.user_metadata || {};

    // 3. Confirm User Email
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true
    });
    if (updateError) throw updateError;

    // 4. Create Profile
    const { data: existingProfile } = await supabaseAdmin.from('profiles').select('id').eq('id', userId).single();
    if (!existingProfile) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert([{
          id: userId,
          role: 'user',
          name: name || email.split('@')[0],
          email,
          dob,
          phone,
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`,
          status: 'active'
        }]);
      if (profileError) throw profileError;
    }

    // 5. Delete OTP
    await supabaseAdmin.from('otps').delete().eq('email', email);

    // 6. Send Welcome Email
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #7c3aed; text-align: center;">Welcome to SkillBridge!</h2>
        <p>Hi <b>${name || 'User'}</b>,</p>
        <p>Your account has been successfully verified! You can now start sharing your skills and learning from others!</p>
        
        ${password ? `
        <div style="background: #f8f7ff; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #7c3aed;">
          <p style="margin: 0; font-size: 11px; color: #7c3aed; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Your Login Credentials</p>
          <div style="margin-top: 15px;">
            <p style="margin: 5px 0; font-size: 14px;"><b>Email:</b> ${email}</p>
            <p style="margin: 5px 0; font-size: 14px;"><b>Password:</b> ${password}</p>
          </div>
        </div>
        <p style="font-size: 12px; color: #666;">We recommend changing your password after your first login for better security.</p>
        ` : ''}

        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
        <p style="font-size: 11px; color: #aaa; text-align: center;">SkillBridge Platform &bull; 2026</p>
      </div>
    `;
    await sendEmail(email, 'Welcome to SkillBridge - Your Credentials', `Hi ${name || 'User'}, your account is verified.`, htmlContent);
    console.log(`[VerifyOTP] Welcome email sent to ${email}`);

    res.status(200).json({ success: true, message: 'Account verified successfully' });
  } catch (error: any) {
    console.error('Verify Registration OTP Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // 1. Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // 2. Fetch real profile data (including role) from the database
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.warn('Profile fetch error:', profileError.message);
    }

    // 3. Return success with the actual role and refresh token
    res.status(200).json({ 
      success: true, 
      role: profile?.role || "user", 
      token: data.session?.access_token,
      refreshToken: data.session?.refresh_token, // Added refresh token
      user: { 
        id: data.user.id, 
        name: profile?.name || data.user.user_metadata.name || 'User', 
        email: data.user.email 
      }
    });
  } catch (error: any) {
    console.error('Login Error:', error.message);
    res.status(401).json({ success: false, error: error.message });
  }
};

// Simple in-memory OTP store for development
const otpStore = new Map<string, { otp: string, expiresAt: number }>();

export const sendForgotPasswordOtp = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    console.log(`[ForgotPassword] Request for email: ${email}`);
    // Check if user exists in Supabase Auth (more reliable than profiles table)
    const { data: authList, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError || !authList) {
      console.error('[ForgotPassword] Supabase Auth Error:', authError);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const authUser = (authList.users as any[]).find((u: any) => u.email === email);

    if (!authUser) {
      console.warn(`[ForgotPassword] User not found in Auth for email: ${email}`);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log(`[ForgotPassword] User found: ${authUser.id}`);

    // Try to get name from profiles table (optional — fallback to email prefix)
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('email', email)
      .maybeSingle();

    const userName = profile?.name || authUser.user_metadata?.name || email.split('@')[0];

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    otpStore.set(email, { otp, expiresAt });
    console.log(`[DEBUG] ForgotPassword OTP for ${email} is: ${otp}`);

    const subject = 'Reset Your SkillBridge Password';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #7c3aed; text-align: center;">Reset Your Password</h2>
        <p>Hi <b>${userName}</b>,</p>
        <p>We received a request to reset your password. Please use the following OTP to proceed:</p>
        <div style="background: #f8f7ff; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #7c3aed; text-align: center;">
          <h1 style="margin: 0; color: #7c3aed; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p style="font-size: 12px; color: #666;">This OTP is valid for 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
        <p style="font-size: 11px; color: #aaa; text-align: center;">SkillBridge Platform &bull; 2026</p>
      </div>
    `;

    // Send in background
    console.log(`[ForgotPassword] Attempting to send email to: ${email}`);
    sendEmail(email, subject, `Your password reset OTP is: ${otp}`, html)
      .then(resp => console.log(`[ForgotPassword] Email sent successfully:`, resp))
      .catch(err => console.error('[ForgotPassword] Email Error:', err));

    res.status(200).json({ success: true, message: 'Password reset initiated. OTP will be sent to your email.' });
  } catch (error: any) {
    console.error('Send OTP Error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
};

export const verifyForgotPasswordOtp = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
  }

  try {
    const record = otpStore.get(email);

    if (!record) {
      return res.status(400).json({ success: false, message: 'OTP not found or expired. Please request a new one.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // OTP is valid, now we update the user's password in Supabase Auth
    const { data: authList, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError || !authList) {
      throw new Error('User not found');
    }

    const authUser = (authList.users as any[]).find((u: any) => u.email === email);

    if (!authUser) throw new Error('User not found');

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      { password: newPassword }
    );

    if (updateError) throw updateError;

    // Clear the OTP from store after successful password reset
    otpStore.delete(email);

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('Verify OTP Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'Refresh token is required' });
  }

  try {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    res.status(200).json({
      success: true,
      token: data.session.access_token,
      refreshToken: data.session.refresh_token
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
