// Razorpay Payment Integration
declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number; // in paise (smallest currency unit)
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  prefill?: {
    email?: string;
    contact?: string;
    name?: string;
  };
  theme?: {
    color: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss: () => void;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface PaymentPlan {
  id: 'monthly' | 'quarterly' | 'yearly';
  name: string;
  amount: number; // in rupees
  duration: string;
  description: string;
}

export const PLANS: Record<string, PaymentPlan> = {
  monthly: {
    id: 'monthly',
    name: 'Monthly Plan',
    amount: 499,
    duration: '1 month',
    description: 'Billed monthly',
  },
  quarterly: {
    id: 'quarterly',
    name: 'Quarterly Plan',
    amount: 1299,
    duration: '3 months',
    description: 'Billed every 3 months (Save 13%)',
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly Plan',
    amount: 4999,
    duration: '1 year',
    description: 'Billed yearly (Save 17%)',
  },
};

// Load Razorpay script dynamically
export const loadRazorpayScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay script'));
    document.body.appendChild(script);
  });
};

// Create Razorpay order (call your backend API)
export const createRazorpayOrder = async (
  planId: string,
  userId: string
): Promise<{ orderId: string }> => {
  const plan = PLANS[planId];
  if (!plan) {
    throw new Error('Invalid plan selected');
  }

  // Call your backend API to create order
  // For now, we'll use Razorpay client-side integration
  // In production, you should create orders server-side for security
  const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: plan.amount * 100, // Convert to paise
      currency: 'INR',
      planId,
      userId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create order');
  }

  return response.json();
};

// Initialize Razorpay checkout
export const initializeRazorpay = async (
  planId: string,
  userEmail: string,
  userName: string,
  userPhone: string,
  onSuccess: (response: RazorpayResponse) => void,
  onError: (error: string) => void
): Promise<void> => {
  try {
    await loadRazorpayScript();

    const plan = PLANS[planId];
    if (!plan) {
      onError('Invalid plan selected');
      return;
    }

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!razorpayKey) {
      onError('Razorpay key not configured');
      return;
    }

    // Create order ID (in production, this should come from your backend)
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const options: RazorpayOptions = {
      key: razorpayKey,
      amount: plan.amount * 100, // Convert rupees to paise
      currency: 'INR',
      name: 'PortIQ',
      description: `${plan.name} - ${plan.description}`,
      order_id: orderId,
      prefill: {
        email: userEmail,
        contact: userPhone || undefined,
        name: userName || undefined,
      },
      theme: {
        color: '#000000',
      },
      handler: async (response: RazorpayResponse) => {
        try {
          // Verify payment on backend
          const verifyResponse = await fetch(
            `${import.meta.env.VITE_API_URL || ''}/api/verify-payment`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                planId,
              }),
            }
          );

          if (verifyResponse.ok) {
            onSuccess(response);
          } else {
            onError('Payment verification failed');
          }
        } catch (error) {
          console.error('Payment verification error:', error);
          onError('Payment verification failed');
        }
      },
      modal: {
        ondismiss: () => {
          onError('Payment cancelled by user');
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  } catch (error) {
    console.error('Razorpay initialization error:', error);
    onError(error instanceof Error ? error.message : 'Failed to initialize payment');
  }
};

// Simplified payment flow (for development/testing without backend)
export const initializeRazorpaySimple = (
  planId: string,
  userEmail: string,
  userName: string,
  onSuccess: (response: RazorpayResponse) => void,
  onError: (error: string) => void
): void => {
  loadRazorpayScript()
    .then(() => {
      const plan = PLANS[planId];
      if (!plan) {
        onError('Invalid plan selected');
        return;
      }

      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        onError('Razorpay key not configured. Please add VITE_RAZORPAY_KEY_ID to your .env file');
        return;
      }

      const options: RazorpayOptions = {
        key: razorpayKey,
        amount: plan.amount * 100,
        currency: 'INR',
        name: 'PortIQ',
        description: `${plan.name} - ${plan.description}`,
        prefill: {
          email: userEmail,
          name: userName || undefined,
        },
        theme: {
          color: '#000000',
        },
        handler: (response) => {
          // In production, verify this on your backend
          onSuccess(response);
        },
        modal: {
          ondismiss: () => {
            onError('Payment cancelled');
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    })
    .catch((error) => {
      console.error('Error loading Razorpay:', error);
      onError('Failed to load payment gateway');
    });
};

