import { supabase } from "./supabase";

export async function findStudentByEmail(email: string, columns = "*") {
  // Try Personal Mail ID first
  const { data: d1 } = await supabase
    .from("students")
    .select(columns)
    .eq("Personal Mail ID", email)
    .limit(1)
    .maybeSingle();
  if (d1) return d1;

  // Fall back to Domain Mail ID
  const { data: d2 } = await supabase
    .from("students")
    .select(columns)
    .eq("Domain Mail ID", email)
    .limit(1)
    .maybeSingle();
  return d2 ?? null;
}
