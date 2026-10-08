import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
  cnic: string;
  plate: string;
}
const emptyProfile: UserProfile = { name: '', phone: '', email: '', cnic: '', plate: '' };
interface UserContextType {
  profile: UserProfile;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}
const UserContext = createContext<UserContextType>({ profile: emptyProfile, refreshProfile: async () => {}, updateProfile: async () => {} });

const PROFILE_CACHE_KEY = '@roadwatch_user_profile';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);

  // Load cached profile immediately on boot
  useEffect(() => {
    void AsyncStorage.getItem(PROFILE_CACHE_KEY).then((cached) => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            setProfile((prev) => ({ ...prev, ...parsed }));
          }
        } catch {}
      }
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setProfile(emptyProfile);
      await AsyncStorage.removeItem(PROFILE_CACHE_KEY).catch(() => {});
      return;
    }

    try {
      const [userRes, reporterRes] = await Promise.all([
        supabase.from('base_users').select('name,phone,email,cnic_last4').eq('user_id', auth.user.id).maybeSingle(),
        supabase.from('reporter_profiles').select('vehicle_plate').eq('reporter_id', auth.user.id).maybeSingle(),
      ]);

      const userData = userRes.data;
      const reporterData = reporterRes.data;

      // Also get cached local profile to preserve un-synced fields
      let localCached: Partial<UserProfile> = {};
      try {
        const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        if (raw) localCached = JSON.parse(raw);
      } catch {}

      const resolvedName = userData?.name || localCached.name || auth.user.user_metadata?.full_name || '';
      const resolvedPhone = userData?.phone || localCached.phone || auth.user.phone || '';
      const resolvedEmail = userData?.email || auth.user.email || localCached.email || '';
      const resolvedCnic = userData?.cnic_last4
        ? `••••••••${userData.cnic_last4}`
        : localCached.cnic || '';
      const resolvedPlate = reporterData?.vehicle_plate || localCached.plate || '';

      const updatedProfile: UserProfile = {
        name: resolvedName,
        phone: resolvedPhone,
        email: resolvedEmail,
        cnic: resolvedCnic,
        plate: resolvedPlate,
      };

      setProfile(updatedProfile);
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updatedProfile)).catch(() => {});
    } catch {
      // If network fails, keep state resilient
    }
  }, []);

  useEffect(() => {
    void refreshProfile().catch(() => {});
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setProfile(emptyProfile);
        void AsyncStorage.removeItem(PROFILE_CACHE_KEY).catch(() => {});
      } else {
        setTimeout(() => { void refreshProfile().catch(() => {}); }, 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [refreshProfile]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const { data: auth } = await supabase.auth.getUser();
    
    // Save locally first for instant UI response
    setProfile((prev) => {
      const merged = { ...prev, ...updates };
      void AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(merged)).catch(() => {});
      return merged;
    });

    if (!auth?.user) return;

    try {
      if (updates.name !== undefined || updates.email !== undefined || updates.phone !== undefined || updates.cnic !== undefined) {
        const cnicDigits = updates.cnic ? updates.cnic.replace(/\D/g, '').slice(-4) : undefined;
        await supabase.from('base_users').upsert({
          user_id: auth.user.id,
          ...(updates.name !== undefined ? { name: updates.name } : {}),
          ...(updates.email !== undefined ? { email: updates.email } : {}),
          ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
          ...(cnicDigits ? { cnic_last4: cnicDigits } : {}),
          account_state: 'active',
          registration_completed_at: new Date().toISOString(),
        });
      }

      if (updates.plate !== undefined) {
        await supabase.from('reporter_profiles').upsert({
          reporter_id: auth.user.id,
          vehicle_plate: updates.plate,
        });
      }
    } catch {
      // safe fallback
    }

    await refreshProfile();
  }, [refreshProfile]);
  return <UserContext.Provider value={{ profile, refreshProfile, updateProfile }}>{children}</UserContext.Provider>;
}
export function useUserProfile() { return useContext(UserContext); }
