import { supabase } from './supabase';
import { initializeRazorpaySimple, RazorpayResponse, PLANS } from './razorpay';

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
  /**
   * Process payment for a subscription plan
   */
  static async processPayment(
    planId: 'monthly' | 'quarterly' | 'yearly',
    userId: string,
    userEmail: string,
    userName: string
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      initializeRazorpaySimple(
        planId,
        userEmail,
        userName,
        async (response: RazorpayResponse) => {
          try {
            // Save subscription to database
            const result = await this.saveSubscription(userId, planId, response);
            if (result.success) {
              resolve({ success: true });
            } else {
              resolve({ success: false, error: result.error });
            }
          } catch (error) {
            console.error('Error processing payment:', error);
            resolve({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to process payment',
            });
          }
        },
        (error: string) => {
          resolve({ success: false, error });
        }
      );
    });
  }

  /**
   * Save subscription to database
   */
  static async saveSubscription(
    userId: string,
    planId: 'monthly' | 'quarterly' | 'yearly',
    paymentResponse: RazorpayResponse
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const plan = PLANS[planId];
      if (!plan) {
        return { success: false, error: 'Invalid plan' };
      }

      // Calculate end date based on plan
      const startDate = new Date();
      const endDate = new Date();
      
      if (planId === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (planId === 'quarterly') {
        endDate.setMonth(endDate.getMonth() + 3);
      } else if (planId === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      // Check if user has an existing subscription
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (existingSubscription) {
        // Update existing subscription
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            plan_id: planId,
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSubscription.id);

        if (updateError) {
          return { success: false, error: updateError.message };
        }
      } else {
        // Create new subscription
        const { error: insertError } = await supabase.from('subscriptions').insert({
          user_id: userId,
          plan_id: planId,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
        });

        if (insertError) {
          return { success: false, error: insertError.message };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error saving subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save subscription',
      };
    }
  }

  /**
   * Get user's current subscription
   */
  static async getUserSubscription(userId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
      };
    }
  }
}

