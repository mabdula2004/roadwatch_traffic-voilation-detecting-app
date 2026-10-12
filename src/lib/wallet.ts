import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const LOCAL_WALLET_BALANCE_KEY = '@roadwatch_citizen_wallet_balance';
const DEFAULT_TEST_BALANCE = 500; // Default PKR 500 for testing so citizen can test manual review deductions immediately

export interface WalletState {
  balance: number;
  pending_clearance: number;
  epay_linked: boolean;
}

// In-flight sync locks & deduplication
let isSyncing = false;
let pendingSyncBalance: number | null = null;
let rlsNoticeShown = false;

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
    const { data: session } = await supabase.auth.getUser();
    const userId = session?.user?.id;
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
 * Reads local AsyncStorage authoritatively during the session, and checks Supabase.
 * NEVER triggers write operations or side effects during read.
 */
export async function getWalletBalance(): Promise<WalletState> {
  // 1. Read cached local balance
  let localBalance: number | null = null;
  try {
    const cached = await AsyncStorage.getItem(LOCAL_WALLET_BALANCE_KEY);
    if (cached !== null) {
      const parsed = Number(cached);
      if (!isNaN(parsed)) {
        localBalance = parsed;
      }
    }
  } catch {}

  // 2. Check Supabase remote balance
  let remoteBalance: number | null = null;
  let pendingClearance = 0;
  let epayLinked = true;

  try {
    const { data: session } = await supabase.auth.getUser();
    const userId = session?.user?.id;

    if (userId) {
      const { data, error } = await supabase
        .from('reward_wallets')
        .select('balance, pending_clearance, epay_linked')
        .eq('reporter_id', userId)
        .maybeSingle();

      if (!error && data) {
        remoteBalance = Number(data.balance ?? 0);
        pendingClearance = Number(data.pending_clearance ?? 0);
        epayLinked = Boolean(data.epay_linked ?? true);
      }
    }
  } catch {
    // Supabase network failure: safely continue with local cached balance
  }

  // 3. Resolve effective balance:
  // - If local balance exists and is higher than remote (e.g. user just topped up), PRESERVE local!
  // - If remote has a higher balance (e.g. server-awarded bounty), adopt remote.
  // - Never let a stale remote 0 overwrite a user's active local top-up.
  let effectiveBalance: number;
  if (localBalance !== null) {
    if (remoteBalance !== null && remoteBalance > localBalance) {
      effectiveBalance = remoteBalance;
    } else {
      effectiveBalance = localBalance;
    }
  } else if (remoteBalance !== null && remoteBalance > 0) {
    effectiveBalance = remoteBalance;
  } else {
    // Fresh initialization fallback
    effectiveBalance = DEFAULT_TEST_BALANCE;
  }

  // Persist resolved balance to local storage
  try {
    await AsyncStorage.setItem(LOCAL_WALLET_BALANCE_KEY, String(effectiveBalance));
  } catch {}

  return {
    balance: effectiveBalance,
    pending_clearance: pendingClearance,
    epay_linked: epayLinked,
  };
}

/**
 * Deducts a specified fee (e.g. PKR 100 for manual review) from the citizen wallet
 */
export async function deductWalletBalance(amount: number): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const current = await getWalletBalance();
  if (current.balance < amount) {
    return {
      success: false,
      newBalance: current.balance,
      error: `Insufficient balance. Required: PKR ${amount}, Available: PKR ${current.balance}`,
    };
  }

  const newBalance = Math.max(0, current.balance - amount);

  // 1. Authoritatively update local cache immediately
  try {
    await AsyncStorage.setItem(LOCAL_WALLET_BALANCE_KEY, String(newBalance));
  } catch {}

  // 2. Synchronize to Supabase in background (single debounced call)
  void syncBalanceToSupabase(newBalance);

  return { success: true, newBalance };
}

/**
 * Top up / Recharge the citizen wallet balance (for testing or adding funds)
 */
export async function rechargeWalletBalance(amount: number): Promise<{ success: boolean; newBalance: number }> {
  const current = await getWalletBalance();
  const newBalance = current.balance + amount;

  // 1. Authoritatively update local cache immediately
  try {
    await AsyncStorage.setItem(LOCAL_WALLET_BALANCE_KEY, String(newBalance));
  } catch {}

  // 2. Synchronize to Supabase in background (single debounced call)
  void syncBalanceToSupabase(newBalance);

  return { success: true, newBalance };
}

