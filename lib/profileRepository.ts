import { supabase } from "./supabase";
import type { ProfilePreferencesRow } from "./profile";

export type ProfilePatch = Partial<Omit<ProfilePreferencesRow, "id">>;

export interface ProfileRepository {
  get(userId: string, columns: string): Promise<ProfilePreferencesRow>;
  patch(userId: string, patch: ProfilePatch): Promise<void>;
  getOrCreateForLogin(userId: string, email: string | undefined, name: string | undefined): Promise<{ hasName: boolean | null }>;
}

export const supabaseProfileRepository: ProfileRepository = {
  async get(userId, columns) {
    const { data, error } = await supabase.from("Profiles").select(columns).eq("id", userId).single();
    if (error) throw error;
    return data as unknown as ProfilePreferencesRow;
  },
  async patch(userId, patch) {
    const { error } = await supabase.from("Profiles").update(patch).eq("id", userId).select("id").single();
    if (error) throw error;
  },
  async getOrCreateForLogin(userId, email, name) {
    const existing = await supabase.from("Profiles").select("hasName").eq("id", userId).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return existing.data;

    const created = await supabase.from("Profiles")
      .insert({ id: userId, email, name })
      .select("hasName")
      .single();
    if (created.error) throw created.error;
    return created.data;
  },
};
