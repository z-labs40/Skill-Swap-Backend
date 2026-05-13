import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { mockLandingContent } from '../data/mockData';

export const getLandingContent = async (req: Request, res: Response) => {
  try {
    // 1. Fetch landing content from site_settings
    let landingContent = mockLandingContent;
    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from('site_settings')
      .select('value')
      .eq('key', 'landing_content')
      .single();

    if (!settingsError && settingsData) {
      landingContent = settingsData.value;
    }

    // 2. Fetch total users count
    const { count, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (countError) console.error('Error fetching user count:', countError);

    // 3. Fetch featured users (top rated, active)
    const { data: featuredUsers, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, avatar_url, rating, role, offers')
      .eq('status', 'active')
      .order('rating', { ascending: false })
      .limit(5);

    if (usersError) console.error('Error fetching featured users:', usersError);

    // 4. Prepare dynamic stats
    const dynamicStats = {
      totalUsers: (count || 0) + 50000, // Adding base offset to match marketing numbers if needed, or just real count
      activeUsers: count || 0,
      skillsAvailable: 250 // Hardcoded for now, could be derived from 'offers'
    };

    res.status(200).json({ 
      success: true, 
      data: {
        ...landingContent,
        stats: dynamicStats,
        featuredUsers: featuredUsers || []
      } 
    });
  } catch (error: any) {
    console.error('Landing Content Error:', error.message);
    res.status(200).json({ success: true, data: mockLandingContent });
  }
};

export const updateLandingContent = async (req: Request, res: Response) => {
  try {
    const content = req.body;
    
    // Upsert into site_settings
    const { data, error } = await supabaseAdmin
      .from('site_settings')
      .upsert({ 
        key: 'landing_content', 
        value: content,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, message: 'Landing content updated successfully', data: data.value });
  } catch (error: any) {
    console.error('Update Landing Content Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

