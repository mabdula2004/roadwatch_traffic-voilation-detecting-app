import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const refreshProfile = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setProfile(emptyProfile); return; }
    const [user, reporter] = await Promise.all([
      supabase.from('base_users').select('name,phone,email,cnic_last4').eq('user_id', auth.user.id).single(),
      supabase.from('reporter_profiles').select('vehicle_plate').eq('reporter_id', auth.user.id).single(),
    ]);
    if (user.error) throw user.error;
    setProfile({
      name: user.data?.name ?? '', phone: user.data?.phone ?? auth.user.phone ?? '',
      email: user.data?.email ?? '', cnic: user.data?.cnic_last4 ? `•••••••••${user.data.cnic_last4}` : '',
      plate: reporter.data?.vehicle_plate ?? '',
    });
  }, []);
  useEffect(() => {
    void refreshProfile().catch(() => {});
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setProfile(emptyProfile);
      else setTimeout(() => { void refreshProfile().catch(() => {}); }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [refreshProfile]);
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const { error } = await supabase.rpc('update_reporter_profile', {
      p_name: updates.name ?? profile.name,
      p_email: updates.email ?? profile.email,
      p_vehicle_plate: updates.plate ?? profile.plate,
    });
    if (error) throw error;
    await refreshProfile();
  }, [profile, refreshProfile]);
  return <UserContext.Provider value={{ profile, refreshProfile, updateProfile }}>{children}</UserContext.Provider>;
}
export function useUserProfile() { return useContext(UserContext); }
