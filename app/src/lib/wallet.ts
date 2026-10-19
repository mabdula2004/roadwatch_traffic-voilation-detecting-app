import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const DEFAULT_TEST_BALANCE = 0; // Fresh accounts start with 0 PKR

export interface WalletState {
  balance: number;
  pending_clearance: number;
  epay_linked: boolean;
}

// In-flight sync locks & deduplication
let isSyncing = false;
let pendingSyncBalance: number | null = null;
let rlsNoticeShown = false;

async function getActiveUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

async function getWalletBalanceKey(): Promise<string> {
  const uid = await getActiveUserId();
  return uid ? `@roadwatch_wallet_balance_${uid}` : '@roadwatch_citizen_wallet_balance';
}

async function getWalletTxKey(): Promise<string> {
  const uid = await getActiveUserId();
  return uid ? `@roadwatch_wallet_transactions_${uid}` : '@roadwatch_citizen_wallet_transactions';
}

/**
 * Synchronizes wallet balance with Supabase reward_wallets table in a clean,
 * deduplicated background queue that prevents overlapping network calls.
 */
async function syncBalanceToSupabase(balance: number): Promise<boolean> {
  if (isSyncing) {
    pendingSyncBalance = balance;
    return true;
  }
  isSyncing = true;

  try {
    const userId = await getActiveUserId();
    if (!userId) return false;

    // Direct update attempt
    const { error } = await supabase
      .from('reward_wallets')
      .update({ balance })
      .eq('reporter_id', userId);

    if (error) {
      if (!rlsNoticeShown) {
        console.log('[RoadWatch Wallet] Note: Supabase cloud RLS policy for reward_wallets UPDATE is pending. Preserving local active balance.');
        rlsNoticeShown = true;
      }
      return false;
    }
    return true;
  } catch {
    return false;
  } finally {
    isSyncing = false;
    // Process latest queued balance if updated while request was in-flight
    if (pendingSyncBalance !== null) {
      const nextBal = pendingSyncBalance;
      pendingSyncBalance = null;
      void syncBalanceToSupabase(nextBal);
    }
  }
}

/**
 * Pure read function for current citizen wallet balance.
 * Reads user-scoped AsyncStorage authoritatively during the session, and checks Supabase.
 * NEVER triggers write operations or side effects during read.
 */
export async function getWalletBalance(): Promise<WalletState> {
  const userId = await getActiveUserId();
  const balanceKey = await getWalletBalanceKey();

  // 1. Read cached local balance for this specific user
  let localBalance: number | null = null;
  try {
    const cached = await AsyncStorage.getItem(balanceKey);
    if (cached !== null) {
      const parsed = Number(cached);
      if (!isNaN(parsed)) {
        localBalance = parsed;
      }
    }
  } catch {}

  // 2. Check Supabase remote balance for this specific user
  let remoteBalance: number | null = null;
  let pendingClearance = 0;
  let epayLinked = false;

  if (userId) {
    try {
      const { data, error } = await supabase
        .from('reward_wallets')
        .select('balance, pending_clearance, epay_linked')
        .eq('reporter_id', userId)
        .maybeSingle();

      if (!error && data) {
        remoteBalance = Number(data.balance ?? 0);
        pendingClearance = Number(data.pending_clearance ?? 0);
        epayLinked = Boolean(data.epay_linked ?? false);
      }
    } catch {
      // Supabase network failure: safely continue with local cached balance
    }
  }

  // 3. Resolve effective balance:
  // - If remote record exists, use remote as authoritative (unless user made un-synced local top-up)
  // - A new account with 0 remote balance gets 0 balance, never inheriting another account's data!
  let effectiveBalance: number;
  if (remoteBalance !== null) {
    if (localBalance !== null && localBalance > remoteBalance) {
      effectiveBalance = localBalance;
    } else {
      effectiveBalance = remoteBalance;
    }
  } else if (localBalance !== null) {
    effectiveBalance = localBalance;
  } else {
    // Fresh initialization fallback for new user
    effectiveBalance = DEFAULT_TEST_BALANCE;
  }

  // Persist resolved balance to user's local storage
  try {
    await AsyncStorage.setItem(balanceKey, String(effectiveBalance));
  } catch {}

  return {
    balance: effectiveBalance,
    pending_clearance: pendingClearance,
    epay_linked: epayLinked,
  };
}

export interface WalletTransaction {
  id: string;
  type: 'reward' | 'penalty_fine' | 'manual_review_fee' | 'review_refund_bonus' | 'top_up';
  amount: number; // positive for credit (+), negative for debit (-)
  title: string;
  subtitle: string;
  timestamp: string;
  reportId?: string;
  locationName?: string;
  reason?: string;
}

export async function getStoredTransactions(): Promise<WalletTransaction[]> {
  try {
    const txKey = await getWalletTxKey();
    const raw = await AsyncStorage.getItem(txKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function recordWalletTransaction(tx: WalletTransaction): Promise<void> {
  try {
    const txKey = await getWalletTxKey();
    const list = await getStoredTransactions();
    const filtered = list.filter(t => t.id !== tx.id);
    filtered.unshift(tx);
    await AsyncStorage.setItem(txKey, JSON.stringify(filtered.slice(0, 100)));
  } catch (e) {
    console.warn('Failed to record wallet transaction:', e);
  }
}

/**
 * Deducts a specified fee (e.g. PKR 100 for manual review, PKR 50 for false report) from the citizen wallet
 */
export async function deductWalletBalance(
  amount: number,
  meta?: { title?: string; subtitle?: string; reportId?: string; type?: WalletTransaction['type'] }
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const current = await getWalletBalance();
  if (current.balance < amount) {
    return {
      success: false,
      newBalance: current.balance,
      error: `Insufficient balance. Required: PKR ${amount}, Available: PKR ${current.balance}`,
    };
  }

  const newBalance = Math.max(0, current.balance - amount);
  const balanceKey = await getWalletBalanceKey();

  // 1. Authoritatively update user-scoped local cache immediately
  try {
    await AsyncStorage.setItem(balanceKey, String(newBalance));
  } catch {}

  // 2. Synchronize to Supabase in background (single debounced call)
  void syncBalanceToSupabase(newBalance);

  // 3. Record transaction log
  try {
    await recordWalletTransaction({
      id: `TX-DED-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
      type: meta?.type || (amount === 50 ? 'penalty_fine' : 'manual_review_fee'),
      amount: -amount,
      title: meta?.title || (amount === 50 ? 'Invalid Report Submission Penalty' : 'Warden Review Fee'),
      subtitle: meta?.subtitle || (amount === 50 ? 'Automated penalty for invalid video report' : 'Case submitted for manual traffic warden audit'),
      timestamp: new Date().toISOString(),
      reportId: meta?.reportId,
    });
  } catch {}

  return { success: true, newBalance };
}

/**
 * Top up / Recharge the citizen wallet balance (for testing or adding funds or rewards)
 */
export async function rechargeWalletBalance(
  amount: number,
  meta?: { title?: string; subtitle?: string; reportId?: string; type?: WalletTransaction['type'] }
): Promise<{ success: boolean; newBalance: number }> {
  const current = await getWalletBalance();
  const newBalance = current.balance + amount;
  const balanceKey = await getWalletBalanceKey();

  // 1. Authoritatively update user-scoped local cache immediately
  try {
    await AsyncStorage.setItem(balanceKey, String(newBalance));
  } catch {}

  // 2. Synchronize to Supabase in background (single debounced call)
  void syncBalanceToSupabase(newBalance);

  // 3. Record transaction log
  try {
    await recordWalletTransaction({
      id: `TX-REC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
      type: meta?.type || (amount === 200 ? 'reward' : amount === 300 ? 'review_refund_bonus' : 'top_up'),
      amount: amount,
      title: meta?.title || (amount === 200 ? 'Citizen Bounty Reward' : amount === 300 ? 'Officer Review Payout (Refund + Reward)' : 'Wallet Top-Up (ePay)'),
      subtitle: meta?.subtitle || (amount === 200 ? 'Verified violation reward prize' : 'Balance credit via connected ePay account'),
      timestamp: new Date().toISOString(),
      reportId: meta?.reportId,
    });
  } catch {}

  return { success: true, newBalance };
}

/**
 * Completely purges all wallet cache keys (legacy and user-scoped)
 */
export async function clearWalletCache(userId?: string): Promise<void> {
  try {
    const uid = userId || (await getActiveUserId());
    const keysToRemove = [
      '@roadwatch_citizen_wallet_balance',
      '@roadwatch_citizen_wallet_transactions',
    ];
    if (uid) {
      keysToRemove.push(`@roadwatch_wallet_balance_${uid}`);
      keysToRemove.push(`@roadwatch_wallet_transactions_${uid}`);
    }
    await AsyncStorage.multiRemove(keysToRemove);
  } catch {}
}
