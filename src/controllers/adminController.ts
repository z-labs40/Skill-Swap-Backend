import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import stringSimilarity from 'string-similarity';
import { sendEmail } from '../utils/emailService';


/**
 * Fetch Skill Analytics (Top offered and sought skills)
 */
export const getSkillAnalytics = async (req: Request, res: Response) => {
  try {
    const [profilesRes, messagesRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('name, offers, seeks, rating, id, status, avatar_url'),
      supabaseAdmin.from('messages').select('timestamp, id')
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (messagesRes.error) throw messagesRes.error;

    const profiles = profilesRes.data || [];
    const messages = messagesRes.data || [];

    const offeredMap: Record<string, number> = {};
    const soughtMap: Record<string, number> = {};
    const displayNameMap: Record<string, string> = {}; 
    const categoryMap: Record<string, number> = {
      'Coding': 0, 'Design': 0, 'Language': 0, 'Music': 0, 'Business': 0
    };
    const normalizedToKey: Record<string, string> = {}; // Map normalized string to a "canonical" key

    const normalize = (skill: string) => skill.toLowerCase().replace(/[^a-z0-9]/g, '');

    const getCategory = (skill: string) => {
      const coding = ['Python', 'ReactJS', 'Node.js', 'Web Dev', 'Cybersecurity', 'JavaScript'];
      const design = ['UI/UX Design', 'Figma', 'Photoshop', 'Illustrator'];
      if (coding.includes(skill)) return 'Coding';
      if (design.includes(skill)) return 'Design';
      return 'Other';
    };

    const getCanonicalKey = (skill: string, existingKeys: string[]) => {
      const norm = normalize(skill);
      if (normalizedToKey[norm]) return normalizedToKey[norm];

      for (const existingKey of existingKeys) {
        if (Math.abs(norm.length - existingKey.length) > 3) continue;
        const similarity = stringSimilarity.compareTwoStrings(norm, existingKey);
        if (similarity > 0.8) {
          normalizedToKey[norm] = existingKey;
          return existingKey;
        }
      }

      normalizedToKey[norm] = norm;
      return norm;
    };

    profiles.forEach(p => {
      p.offers?.forEach((s: string) => {
        const key = getCanonicalKey(s, Object.keys(offeredMap));
        offeredMap[key] = (offeredMap[key] || 0) + 1;
        if (!displayNameMap[key]) displayNameMap[key] = s;
        const cat = getCategory(s);
        if (cat !== 'Other') categoryMap[cat]++;
      });
      p.seeks?.forEach((s: string) => {
        const key = getCanonicalKey(s, Object.keys(soughtMap));
        soughtMap[key] = (soughtMap[key] || 0) + 1;
        if (!displayNameMap[key]) displayNameMap[key] = s;
      });
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyActivityMap: Record<string, number> = {};
    messages.forEach(m => {
      const date = new Date(m.timestamp);
      const monthName = months[date.getMonth()];
      monthlyActivityMap[monthName] = (monthlyActivityMap[monthName] || 0) + 1;
    });

    const monthlyActivity = months.slice(0, new Date().getMonth() + 1).map(name => ({
      name,
      swaps: monthlyActivityMap[name] || 0
    }));

    const successRate = profiles.length > 0 ? Math.min(99.9, (messages.length / profiles.length) * 15).toFixed(1) : "0";

    const formatStats = (map: Record<string, number>) => 
      Object.entries(map)
        .map(([key, count]) => ({ skill: displayNameMap[key] || key, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const topExperts = profiles
      .filter(p => p.status === 'active')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        rating: p.rating || 0,
        avatarUrl: p.avatar_url,
        topSkill: p.offers?.[0] || 'Member'
      }));

    const trendingSkills = formatStats(soughtMap).slice(0, 4).map((item, i) => ({
      name: item.skill,
      growth: `+${Math.floor(100 / (i + 1))}%`,
      status: i === 0 ? 'VIRAL' : i === 1 ? 'HOT' : 'RISING',
      color: i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-purple-500' : 'bg-emerald-500'
    }));

    res.status(200).json({
      success: true,
      data: {
        topOffered: formatStats(offeredMap),
        topSought: formatStats(soughtMap),
        topExperts,
        totalUsers: profiles.length,
        categories: categoryMap,
        monthlyActivity,
        successRate,
        trendingSkills
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Admin Profile Details
 */
export const getAdminProfile = async (req: Request | any, res: Response) => {
  try {
    const email = req.user?.email || 'admin.sb.dev@gmail.com';
    
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, message: 'Admin profile not found' });
    }

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateAdminProfile = async (req: Request | any, res: Response) => {
  try {
    const { name, avatar_url, dob } = req.body;
    const email = req.user?.email;
    
    if (!email) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Email not found in token' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ name, avatar_url, dob })
      .eq('email', email)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.status(200).json({ success: true, message: 'Profile updated successfully', data: data[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Send Administrative Credentials to an email
 */
export const sendAdminCredentials = async (req: Request | any, res: Response) => {
  try {
    const { receiverEmail } = req.body;
    
    if (!receiverEmail) {
      return res.status(400).json({ success: false, message: 'Receiver email is required' });
    }

    const adminEmail = req.user?.email || 'admin.sb.dev@gmail.com';
    const adminPassword = 'admin123'; // The standard admin password for this identity
    
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background: #fff;">
        <h2 style="color: #7c3aed; text-align: center;">SkillBridge Administrative Access</h2>
        <p>Hello,</p>
        <p>You have been granted secure administrative access. Please use the following credentials to log in to the admin dashboard.</p>
        
        <div style="background: #f8f7ff; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px dashed #7c3aed;">
          <div style="margin-bottom: 15px;">
            <p style="margin: 0; font-size: 11px; color: #7c3aed; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Access Email</p>
            <p style="margin: 5px 0; font-size: 16px; font-weight: bold; color: #111;">${adminEmail}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 11px; color: #7c3aed; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Security Password</p>
            <p style="margin: 5px 0; font-size: 16px; font-weight: bold; color: #111; font-family: monospace;">${adminPassword}</p>
          </div>
        </div>

        <div style="background: #fff9eb; padding: 12px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 12px; color: #92400e;"><strong>Security Warning:</strong> Do not share these credentials. After your first login, we recommend changing your password from the Admin Profile settings.</p>
        </div>

        <p style="font-size: 14px; color: #666;">If you did not expect this, please contact the root administrator immediately.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
        <p style="font-size: 11px; color: #aaa; text-align: center;">SkillBridge Admin Security System &bull; 2026</p>
      </div>
    `;

    const result = await sendEmail(
      receiverEmail,
      'SkillBridge Admin Credentials',
      `Administrative Access for: ${adminEmail}`,
      htmlContent
    );

    if (!result.success) {
      throw new Error('Failed to send email via SMTP service');
    }

    res.status(200).json({ 
      success: true, 
      message: `Administrative credentials have been securely sent to ${receiverEmail}`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
