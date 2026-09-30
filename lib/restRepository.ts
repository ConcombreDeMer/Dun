import { getTodayAppDateKey, isValidAppDateKey } from "./date";
import { supabase } from "./supabase";

export interface RestRepository {
  getEndDate(userId: string): Promise<string | null>;
  setEndDate(userId: string, endDateKey: string): Promise<void>;
  cancel(userId: string): Promise<void>;
  expireIfPast(userId: string, todayKey: string): Promise<string | null>;
}

const updateRest = async (userId: string, restMode: boolean, restEndDate: string | null) => {
  const { error } = await supabase
    .from("Profiles")
    .update({ restMode, restEndDate })
    .eq("id", userId)
    .select("id")
    .single();
  if (error) throw error;
};

const getRestEndDate = async (userId: string) => {
  const { data, error } = await supabase
    .from("Profiles")
    .select("restEndDate")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data.restEndDate;
};

// L'adaptateur historique ne conserve pas les jours de Repos clos. DUN-048 le remplacera.
export const supabaseRestRepository: RestRepository = {
  getEndDate: getRestEndDate,
  async setEndDate(userId, endDateKey) {
    if (!isValidAppDateKey(endDateKey) || endDateKey < getTodayAppDateKey()) {
      throw new Error("Date de fin de Repos invalide");
    }
    await updateRest(userId, true, endDateKey);
  },
  cancel(userId) {
    return updateRest(userId, false, null);
  },
  async expireIfPast(userId, todayKey) {
    if (!isValidAppDateKey(todayKey)) throw new Error("Date du jour invalide");
    const { error } = await supabase
      .from("Profiles")
      .update({ restMode: false, restEndDate: null })
      .eq("id", userId)
      .lt("restEndDate", todayKey)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    // Une prolongation sur un autre appareil a pu arriver depuis la lecture du profil.
    return getRestEndDate(userId);
  },
};
