export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  items?: T[];
  pagination: Pagination;
}

export interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  role: 'admin';
}

export interface Manual {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  level: string;
  language: string;
  is_published: boolean;
  is_premium: boolean;
  cover_url: string | null;
  file_url: string | null;
  tags: string[];
  views: number;
  downloads: number;
  created_at: string;
  users?: { display_name: string };
}

export interface Topic {
  id: string;
  manual_id: string;
  title: string;
  description: string | null;
  content: string | null;
  content_type: 'text' | 'pdf' | 'video' | 'mixed';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_time: number;
  price_xaf: number;
  is_premium: boolean;
  is_published: boolean;
  media_url: string | null;
  order_index: number;
  views: number;
  completion_count: number;
}

export interface Question {
  id: string;
  topic_id: string;
  question_text: string;
  question_text_fr: string | null;
  question_type: 'mcq' | 'true_false' | 'short_answer';
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  options: string[] | null;
  correct_answer: string | null;
  correct_answer_fr: string | null;
  explanation: string | null;
  explanation_fr: string | null;
  order_index: number;
}

export interface PastQuestion {
  id: string;
  exam_title: string;
  exam_year: number;
  subject: string;
  level: string;
  exam_board: string | null;
  paper_type: string | null;
  file_url: string | null;
  solution_url: string | null;
  has_solution: boolean;
  is_premium: boolean;
  is_published: boolean;
  is_verified: boolean;
  views: number;
  downloads: number;
  created_at: string;
  users?: { display_name: string };
}

export interface UserProfile {
  id: string;
  display_name: string;
  email?: string;
  full_name: string | null;
  phone_number: string | null;
  role: 'student' | 'mentor' | 'admin';
  subscription_plan: 'free' | 'basic' | 'premium';
  subscription_active: boolean;
  subscription_end: string | null;
  is_active: boolean;
  exam_level: string | null;
  division: string | null;
  school_name: string | null;
  ai_questions_asked: number;
  ai_monthly_limit: number;
  created_at: string;
  last_login_at: string | null;
}

export interface MentorProfile {
  id: string;
  user_id: string;
  full_name: string;
  subjects: string[];
  bio: string | null;
  hourly_rate: number;
  verification_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  total_sessions: number;
  total_earnings: number;
  pending_payout: number;
  created_at: string;
  users?: { display_name: string; phone_number: string };
}

export interface Payment {
  id: string;
  transaction_id: string;
  user_id: string;
  amount: number;
  currency: 'XAF';
  gateway: 'fapshi' | 'mesomb';
  phone_number: string | null;
  service: 'MTN' | 'ORANGE' | null;
  purpose: 'subscription' | 'topic' | 'past_question' | 'mentor_session';
  subscription_plan: string | null;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
}

export interface PaymentStats {
  totalRevenue: number;
  totalTransactions: number;
  successRate: number;
  revenueByPlan: { basic: number; premium: number; topic: number };
  revenueByGateway: { fapshi: number; mesomb: number };
  revenueByMonth: { month: string; revenue: number }[];
}

export interface DashboardStats {
  totalStudents: number;
  totalMentors: number;
  totalManuals: number;
  totalQuestions: number;
  pendingMentors: number;
  activeSubscriptions: number;
  revenue30Days: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentPayments: Payment[];
  recentUsers: UserProfile[];
}

export interface DiscountCampaign {
  id: string;
  name: string;
  description: string | null;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  applies_to: string[];
  max_uses: number | null;
  current_uses: number;
  user_limit: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: 'payment' | 'content' | 'account' | 'technical' | 'other';
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  users?: { display_name: string; phone_number: string };
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  type: 'general' | 'exam_level' | 'division' | 'subject';
  exam_level: string | null;
  division: string | null;
  subject: string | null;
  is_private: boolean;
  member_count: number;
  created_at: string;
}

export interface PlatformConfig {
  subscription_basic_price: string;
  subscription_premium_price: string;
  topic_default_price: string;
  mentor_commission_percent: string;
  ai_limit_free: string;
  ai_limit_basic: string;
  ai_limit_premium: string;
  past_q_free_views: string;
  discount_leaderboard_top: string;
}
