export interface Swapper {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  offers: string[];
  seeks: string[];
  rating: number;
  match: number;
  isOnline?: boolean;
  avatarUrl?: string;
  isRequested?: boolean;
  reports?: number;
  status: 'active' | 'suspended' | 'deleted';
  suspensionEndDate?: string;
  appealStatus?: 'none' | 'pending' | 'resolved';
  appealMessage?: string;
  reportHistory?: { reason: string; date: string }[];
  password?: string;
  ringtone_url?: string;
}

export interface SupportMessage {
  id: string;
  userEmail: string;
  message: string;
  reply?: string;
  status: 'pending' | 'replied';
  timestamp: string;
}

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

export interface HowItWorksStep {
  number: string;
  title: string;
  description: string;
}

export interface TestimonialItem {
  name: string;
  role: string;
  text: string;
  color: string;
  avatar: string;
}

export interface LandingContent {
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  featuresTitle: string;
  featuresSubtitle: string;
  features: FeatureItem[];
  howItWorksTitle: string;
  howItWorksSubtitle: string;
  steps: HowItWorksStep[];
  testimonialsTitle: string;
  testimonialsSubtitle: string;
  testimonials: TestimonialItem[];
  footerTagline: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: string;
  type: 'text' | 'file' | 'system';
  fileUrl?: string;
}
