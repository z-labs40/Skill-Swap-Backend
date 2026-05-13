import { Swapper, SupportMessage, LandingContent, ChatMessage } from '../models/types';

export let mockSwappers: Swapper[] = [
  {
    id: "user-1",
    name: "Carlos M.",
    email: "carlos@gmail.com",
    password: "password123",
    avatar: "User",
    offers: ["Spanish Language", "Guitar"],
    seeks: ["React Development", "English"],
    rating: 4.9,
    match: 98,
    isOnline: true,
    avatarUrl: "/carlos_avatar_1778031871898.png",
    status: 'active'
  },
  {
    id: "user-2",
    name: "Elena R.",
    email: "elena@gmail.com",
    password: "password123",
    avatar: "Terminal",
    offers: ["Python", "Data Science", "Machine Learning"],
    seeks: ["UI/UX Design", "Figma"],
    rating: 4.8,
    match: 95,
    isOnline: false,
    avatarUrl: "/elena_avatar_1778032087691.png",
    status: 'active'
  },
  {
    id: "user-3",
    name: "Arjun K.",
    email: "arjun@gmail.com",
    password: "password123",
    avatar: "Code2",
    offers: ["ReactJS", "Node.js", "Web Dev"],
    seeks: ["Digital Marketing", "SEO"],
    rating: 5.0,
    match: 88,
    isOnline: true,
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&auto=format&fit=crop",
    reports: 12,
    status: 'suspended',
    suspensionEndDate: '2026-05-16',
    appealStatus: 'pending',
    appealMessage: "I am nallavan, please check my last swaps. I was just joking with that user.",
    reportHistory: [
      { reason: "Inappropriate language", date: "2026-05-01" },
      { reason: "Spamming", date: "2026-05-03" }
    ]
  },
  {
    id: "user-4",
    name: "Priya M.",
    email: "priya@gmail.com",
    password: "password123",
    avatar: "Palette",
    offers: ["Photoshop", "Illustrator", "Logo Design"],
    seeks: ["Next.js", "Tailwind CSS"],
    rating: 4.7,
    match: 85,
    isOnline: false,
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&h=256&auto=format&fit=crop",
    status: 'active',
    reports: 2
  }
];

export let mockSupportMessages: SupportMessage[] = [
  {
    id: "msg-1",
    userEmail: "carlos@gmail.com",
    message: "How do I update my profile picture?",
    status: 'pending',
    timestamp: "2026-05-06T10:00:00Z"
  }
];

export let mockLandingContent: LandingContent = {
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

export let mockMessages: ChatMessage[] = [
  {
    id: "msg-chat-1",
    senderId: "user-1",
    receiverId: "user-3",
    message: "Hey Arjun! I saw you are looking for English help.",
    timestamp: "2026-05-06T10:00:00Z",
    type: 'text'
  }
];
