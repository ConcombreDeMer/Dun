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

export async function deleteUserAccount() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Utilisateur non trouvé");
  }

  try {
    // Supprimer tous les Tasks de l'utilisateur
    const { error: tasksError } = await supabase
      .from("Tasks")
      .delete()
      .eq("user_id", user.id);
    
    if (tasksError) throw tasksError;

    // Supprimer tous les Days de l'utilisateur
    const { error: daysError } = await supabase
      .from("Days")
      .delete()
      .eq("user_id", user.id);
    
    if (daysError) throw daysError;

    // Supprimer le profil de l'utilisateur
    const { error: profileError } = await supabase
      .from("Profiles")
      .delete()
      .eq("id", user.id);
    
    if (profileError) throw profileError;

    // Appeler la RPC pour supprimer le compte d'auth
    const { data, error: rpcError } = await supabase.rpc("delete_account");
    
    if (rpcError) throw rpcError;

    return { success: true };
  } catch (error) {
    console.error("Erreur lors de la suppression du compte:", error);
    throw error;
  }
}
