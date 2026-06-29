export interface Subscription {
  id: string;
  user_id: string;
  plan_id: 'monthly' | 'quarterly' | 'yearly' | 'free';
  status: 'active' | 'cancelled' | 'expired';
  start_date: string;
  end_date: string | null;
  razorpay_payment_id: string | null;
  razorpay_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export class PaymentService {
  static async processPayment(
    _planId: 'monthly' | 'quarterly' | 'yearly',
    _userId: string,
    _userEmail: string,
    _userName: string
  ): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Payments coming soon. Supabase integration pending.' };
  }

  static async getUserSubscription(_userId: string): Promise<Subscription | null> {
    return null;
  }

  static async cancelSubscription(_userId: string): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'No active subscription.' };
  }
}
