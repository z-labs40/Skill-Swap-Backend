import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
const mockLandingContent = {
  heroTitle: "Exchange Skills. Learn Anything.",
  heroSubtitle: "Connect with thousands of learners worldwide. Swap your expertise and master new skills for free.",
  heroCta: "Get Started Free",
  featuresTitle: "Everything you need to master new skills",
  featuresSubtitle: "Our platform provides the perfect ecosystem for skill exchange and peer-to-peer learning.",
  features: [
    { icon: "Zap", title: "Smart Matching", description: "Our AI finds the perfect skill-swap partner based on your goals." },
    { icon: "Shield", title: "Verified Skills", description: "Earn trust badges as you complete sessions and receive ratings." },
    { icon: "MessageSquare", title: "Real-time Chat", description: "Connect instantly with your partners to coordinate learning." }
  ],
  howItWorksTitle: "How SkillBridge Works",
  howItWorksSubtitle: "Start your learning journey in three simple steps.",
  steps: [
    { number: "01", title: "Create Profile", description: "List the skills you have and the ones you want to learn." },
    { number: "02", title: "Match & Connect", description: "Browse profiles or let our AI suggest perfect matches for you." },
    { number: "03", title: "Start Swapping", description: "Schedule a session and start learning from your peer." }
  ],
  testimonialsTitle: "Trusted by thousands of learners",
  testimonialsSubtitle: "See how SkillBridge has helped people around the world master new skills and connect with mentors.",
  testimonials: [
    { name: "Priya Sharma", role: "UI Designer → React Developer", text: "I taught Figma and learned React in return. Within 3 months, I landed a full-stack role.", color: "#a855f7", avatar: "priya_sharma" },
    { name: "Rahul Verma", role: "Python Dev → Spanish Speaker", text: "Met my swap partner Lucia through SkillBridge. Best exchange ever!", color: "#06b6d4", avatar: "rahul_verma" }
  ],
  footerTagline: "The world's largest peer-to-peer skill exchange platform."
};

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

