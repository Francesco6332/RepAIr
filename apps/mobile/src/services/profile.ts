import { supabase } from './supabase';

export type Profile = {
  id: string;
  display_name: string | null;
  created_at?: string;
};

export async function ensureProfile(userId: string, displayName?: string) {
  const { error } = await supabase.from('profiles').upsert(
    { id: userId, display_name: displayName ?? null },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(userId: string, updates: { display_name?: string }) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates }, { onConflict: 'id' });
  if (error) throw error;
}
