# Razorpay Payment Gateway Setup Guide

This guide will help you set up Razorpay payment gateway integration for PortIQ.

## Prerequisites

1. A Razorpay account (Sign up at https://razorpay.com/)
2. Razorpay API keys (Key ID and Key Secret)
3. Supabase database with subscriptions table (migration provided)

## Step 1: Get Razorpay API Keys

1. Log in to your Razorpay Dashboard (https://dashboard.razorpay.com/)
2. Go to **Settings** → **API Keys**
3. Generate test keys (for development) or live keys (for production)
4. Copy your **Key ID** and **Key Secret**

## Step 2: Configure Environment Variables

Create a `.env` file in the root of your project (if it doesn't exist):

```env
# Supabase Configuration (existing)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Razorpay Configuration (new)
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id

# Optional: Backend API URL for payment verification (if you have a backend)
# VITE_API_URL=http://localhost:3000
```

**Important:** 
- Never commit your `.env` file to version control
- The `.env` file is already in `.gitignore`
- Use `VITE_` prefix for client-side environment variables in Vite

## Step 3: Run Database Migration

Run the Supabase migration to create the subscriptions table:

```bash
# If using Supabase CLI
supabase db push

# Or run the SQL file directly in your Supabase dashboard:
# supabase/migrations/20251103000000_create_subscriptions_table.sql
```

The migration creates:
- `subscriptions` table
- Row Level Security policies
- Indexes for performance

## Step 4: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to Settings → Subscription
3. Click "Select Plan" on any plan
4. Razorpay checkout should open
5. Use Razorpay test cards for testing:
   - **Card Number:** `4111 1111 1111 1111`
   - **CVV:** Any 3 digits (e.g., `123`)
   - **Expiry:** Any future date (e.g., `12/25`)
   - **Name:** Any name

## Payment Flow

### Current Implementation (Client-Side)

The current implementation uses Razorpay's client-side checkout. This is suitable for:
- Quick setup and testing
- Development environment
- Small-scale applications

**Limitations:**
- Payment verification happens client-side (less secure)
- No server-side order creation

### Production-Ready Implementation (Recommended)

For production, you should:

1. **Create a backend API** to:
   - Create Razorpay orders server-side
   - Verify payment signatures
   - Store payment details securely

2. **Update payment service** to call your backend API:
   ```typescript
   // In src/lib/razorpay.ts
   // Replace createRazorpayOrder() and verification logic
   // with calls to your backend API
   ```

3. **Backend API endpoints needed:**
   - `POST /api/create-order` - Creates Razorpay order
   - `POST /api/verify-payment` - Verifies payment signature

## File Structure

```
src/
├── lib/
│   ├── razorpay.ts          # Razorpay integration utilities
│   └── paymentService.ts    # Payment service wrapper
supabase/
└── migrations/
    └── 20251103000000_create_subscriptions_table.sql
```

## Subscription Plans

The following plans are configured:

| Plan ID | Name | Amount | Duration | Savings |
|---------|------|--------|----------|---------|
| `monthly` | Monthly Plan | ₹29/month | 1 month | - |
| `quarterly` | Quarterly Plan | ₹69/3 months | 3 months | 20% |
| `yearly` | Yearly Plan | ₹199/year | 1 year | 43% |

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never expose Key Secret in frontend code**
   - Only Key ID should be in `.env` file
   - Key Secret must be kept server-side only

2. **Always verify payments server-side in production**
   - Current implementation is for development/testing
   - Implement backend verification before going live

3. **Use HTTPS in production**
   - Razorpay requires HTTPS for live payments
   - Use environment variables to switch between test/live keys

4. **Implement webhook handlers** (recommended)
   - Set up Razorpay webhooks for payment events
   - Handle subscription renewals, cancellations, etc.

## Troubleshooting

### Payment Modal Not Opening
- Check if `VITE_RAZORPAY_KEY_ID` is set correctly
- Check browser console for errors
- Ensure Razorpay script is loaded

### Payment Verification Fails
- Check Razorpay dashboard for payment status
- Verify Key ID matches your Razorpay account
- Check network requests in browser DevTools

### Database Errors
- Ensure subscriptions table migration is run
- Check Supabase RLS policies
- Verify user authentication

## Next Steps

1. Set up backend API for production use
2. Implement webhook handlers for payment events
3. Add subscription renewal logic
4. Add payment history UI
5. Implement cancellation flow

## Resources

- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay React Integration](https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/build-integration/)
- [Test Cards](https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/test-cards/)

## Support

For issues or questions:
- Razorpay Support: support@razorpay.com
- Check Razorpay Dashboard for transaction logs
- Review browser console for client-side errors

