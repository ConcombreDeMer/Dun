import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Activer la détection du lien de confirmation
  },
});


export async function cancelPendingEmailChange() {
  const { data, error } = await supabase.rpc("cancel_email_change");
  if (error) throw error;

  // Optionnel: refresh du user en mémoire côté client
  await supabase.auth.getUser();

  return data;
}
