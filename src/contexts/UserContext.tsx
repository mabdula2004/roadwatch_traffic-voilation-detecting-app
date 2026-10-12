
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
const UserContext = createContext<UserContextType>({ profile: emptyProfile, refreshProfile: async () => { }, updateProfile: async () => { } });

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
        } catch { }
      }
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    let localCached: Partial<UserProfile> = {};
    try {
      const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
      if (raw) localCached = JSON.parse(raw);
    } catch { }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      if (localCached.name || localCached.phone || localCached.cnic) {
        setProfile((prev) => ({ ...prev, ...localCached }));
      }
      return;
    }

    try {
      const [userRes, reporterRes] = await Promise.all([
        supabase.from('base_users').select('name,phone,email,cnic_last4').eq('user_id', auth.user.id).maybeSingle(),
        supabase.from('reporter_profiles').select('vehicle_plate').eq('reporter_id', auth.user.id).maybeSingle(),
      ]);

      const userData = userRes.data;
      const reporterData = reporterRes.data;

      // Smart resolution: Avoid overwriting user's real name with generic 'Citizen Reporter' default
      let resolvedName = localCached.name || '';
      if (userData?.name && userData.name !== 'Citizen Reporter' && userData.name.trim() !== '') {
        resolvedName = userData.name;
      } else if (!resolvedName) {
        resolvedName = auth.user.user_metadata?.full_name || userData?.name || 'RoadWatch Citizen';
      }

      let resolvedPhone = localCached.phone || '';
      if (userData?.phone && userData.phone.trim() !== '') {
        resolvedPhone = userData.phone;
      } else if (!resolvedPhone) {
        resolvedPhone = auth.user.phone || '';
      }

      let resolvedEmail = localCached.email || '';
      if (userData?.email && userData.email.trim() !== '') {
        resolvedEmail = userData.email;
      } else if (!resolvedEmail) {
        resolvedEmail = auth.user.email || '';
      }

      let resolvedCnic = localCached.cnic || '';
      if (userData?.cnic_last4) {
        resolvedCnic = `••••••••${userData.cnic_last4}`;
      } else if (resolvedCnic) {
        const digits = resolvedCnic.replace(/\D/g, '');
        resolvedCnic = digits.length >= 4 ? `••••••••${digits.slice(-4)}` : '••••••••8899';
      } else {
        resolvedCnic = '••••••••8899';
      }

      let resolvedPlate = localCached.plate || '';
      if (reporterData?.vehicle_plate && reporterData.vehicle_plate.trim() !== '') {
        resolvedPlate = reporterData.vehicle_plate;
      }

      const updatedProfile: UserProfile = {
        name: resolvedName,
        phone: resolvedPhone,
        email: resolvedEmail,
        cnic: resolvedCnic,
        plate: resolvedPlate,
      };

      setProfile(updatedProfile);
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updatedProfile)).catch(() => { });
    } catch {
      // If network fails, keep state resilient from local cache
      if (localCached.name || localCached.phone || localCached.cnic) {
        setProfile((prev) => ({ ...prev, ...localCached }));
      }
    }
  }, []);

  useEffect(() => {
    void refreshProfile().catch(() => { });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setProfile(emptyProfile);
        void AsyncStorage.removeItem(PROFILE_CACHE_KEY).catch(() => { });
      } else {
        setTimeout(() => { void refreshProfile().catch(() => { }); }, 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [refreshProfile]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    // 1. Save locally first for instant UI response and persistence
    let mergedProfile: UserProfile = emptyProfile;
    setProfile((prev) => {
      mergedProfile = { ...prev, ...updates };
      void AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(mergedProfile)).catch(() => { });
      return mergedProfile;
    });

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;

    try {
      // Update Supabase auth user metadata (full_name)
      if (updates.name) {
        try {
          await supabase.auth.updateUser({
            data: { full_name: updates.name },
          });
        } catch { }
      }

      // Try RPC update if available
      if (updates.name || updates.email || updates.plate) {
        try {
          await supabase.rpc('update_reporter_profile', {
            p_name: updates.name || mergedProfile.name,
            p_email: updates.email || mergedProfile.email || null,
            p_vehicle_plate: updates.plate || mergedProfile.plate || null,
          });
        } catch { }
      }

      // Direct base_users update
      const cnicDigits = updates.cnic ? updates.cnic.replace(/\D/g, '').slice(-4) : undefined;
      try {
        await supabase.from('base_users').update({
          ...(updates.name ? { name: updates.name } : {}),
          ...(updates.email ? { email: updates.email } : {}),
          ...(updates.phone ? { phone: updates.phone } : {}),
          ...(cnicDigits ? { cnic_last4: cnicDigits } : {}),
        }).eq('user_id', auth.user.id);
      } catch { }

      // Direct reporter_profiles update
      if (updates.plate) {
        try {
          await supabase.from('reporter_profiles').update({
            vehicle_plate: updates.plate,
          }).eq('reporter_id', auth.user.id);
        } catch { }
      }
    } catch (e) {
      console.log('Remote profile update note:', e);
    }
  }, []);
  return <UserContext.Provider value={{ profile, refreshProfile, updateProfile }}>{children}</UserContext.Provider>;
}
export function useUserProfile() { return useContext(UserContext); }
