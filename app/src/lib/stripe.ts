import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import { rechargeWalletBalance } from './wallet';

export const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  'pk_test_51UUxtuPSnv1Pgw2YKd0xy4L2Bvwit24epffFwl6iDelkBnWHOzPfcz8LiZzHDbyYBh0vkoqOzamMVpQgfQmfozsW00KgdKAknv';

const SUPABASE_FUNCTION_URL =
  `${process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fwofgstzgkhtfzxeangb.supabase.co'}/functions/v1/stripe-wallet`;

export interface StripeCheckoutOptions {
  amountPkr: number;
  reporterId?: string;
  customerEmail?: string;
}

export interface StripeCheckoutResult {
  success: boolean;
  cancelled?: boolean;
  newBalance?: number;
  amountPkr?: number;
  sessionId?: string;
  error?: string;
}

/**
 * Creates a Stripe checkout session via the backend Edge Function
 */
export async function createStripeSession(
  options: StripeCheckoutOptions
): Promise<{ url: string; sessionId: string } | { error: string }> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const reporterId = options.reporterId || authData?.user?.id || 'anonymous-citizen';
    const customerEmail = options.customerEmail || authData?.user?.email;

    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey:
          process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          'sb_publishable_swxR96V85G50zJMLXR-v4g__Bz_BasH',
      },
      body: JSON.stringify({
        action: 'create-session',
        amountPkr: options.amountPkr,
        reporterId,
        customerEmail,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.url) {
      return { error: data.error || 'Failed to initialize Stripe checkout session' };
    }

    return { url: data.url, sessionId: data.sessionId };
  } catch (err: any) {
    return { error: err.message || 'Network error while contacting payment gateway' };
  }
}

/**
 * Verifies a Stripe checkout session with backend and updates balance
 */
export async function verifyStripeSession(
  sessionId: string
): Promise<{ paid: boolean; newBalance?: number; amountPkr?: number; error?: string }> {
  try {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey:
          process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          'sb_publishable_swxR96V85G50zJMLXR-v4g__Bz_BasH',
      },
      body: JSON.stringify({
        action: 'verify-session',
        sessionId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { paid: false, error: data.error || 'Verification request failed' };
    }

    return {
      paid: Boolean(data.paid),
      newBalance: data.newBalance,
      amountPkr: data.amountPkr,
      error: data.message,
    };
  } catch (err: any) {
    return { paid: false, error: err.message || 'Verification network failure' };
  }
}

/**
 * Full end-to-end Stripe Top-Up flow for RoadWatch Citizen Wallet:
 * 1. Creates checkout session via Supabase Edge Function
 * 2. Launches in-app Stripe Checkout modal (Apple Pay, Google Pay, Card)
 * 3. Catches redirect back to roadwatch://wallet
 * 4. Verifies payment with Stripe & credits balance in local storage + Supabase database
 */
export async function launchStripeWalletTopUp(
  options: StripeCheckoutOptions
): Promise<StripeCheckoutResult> {
  const sessionRes = await createStripeSession(options);
  if ('error' in sessionRes) {
    return { success: false, error: sessionRes.error };
  }

  const { url, sessionId } = sessionRes;
  const redirectUrl = Linking.createURL('wallet');

  try {
    // Open Stripe in-app secure browser window
    const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

    let sessionToCheck = sessionId;
    if (result.type === 'success' && result.url) {
      const parsed = Linking.parse(result.url);
      if (parsed.queryParams?.session_id) {
        sessionToCheck = parsed.queryParams.session_id as string;
      }
      if (parsed.queryParams?.status === 'cancelled') {
        return { success: false, cancelled: true };
      }
    }

    // Always verify payment with Stripe backend (whether redirect succeeded, dismissed, or closed)
    const verifyRes = await verifyStripeSession(sessionToCheck);
    if (verifyRes.paid) {
      const topUpAmount = verifyRes.amountPkr || options.amountPkr;

      // Record in local wallet and synchronize
      const rechargeRes = await rechargeWalletBalance(topUpAmount, {
        title: 'Wallet Top-Up (Stripe)',
        subtitle: `Card / Apple Pay Payment · Ref ${sessionToCheck.slice(-8).toUpperCase()}`,
        type: 'top_up',
      });

      return {
        success: true,
        amountPkr: topUpAmount,
        newBalance: rechargeRes.newBalance,
        sessionId: sessionToCheck,
      };
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { success: false, cancelled: true };
    }

    return {
      success: false,
      error: verifyRes.error || 'Payment not completed or pending approval',
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'An error occurred during Stripe checkout' };
  }
}
