import { supabase } from "./supabase";

export type DayRecord = {
  date: string;
  total: number | null;
  done_count: number | null;
  late_adjusted_count: number | null;
};

export interface DayRepository {
  listAll(userId: string): Promise<DayRecord[]>;
  listThrough(userId: string, endIso: string): Promise<DayRecord[]>;
}

export const supabaseDayRepository: DayRepository = {
  async listAll(userId) {
    const { data, error } = await supabase.from("Days")
      .select("*").eq("user_id", userId).order("date", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
  async listThrough(userId, endIso) {
    const { data, error } = await supabase.from("Days")
      .select("date,total,done_count,late_adjusted_count")
      .eq("user_id", userId).lte("date", endIso)
      .order("date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};
