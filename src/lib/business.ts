import { createClient } from "@/lib/supabase/server";

/** Returns the signed in user's first business id, or null when none exists. */
export async function getBusinessId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);
  return data?.[0]?.id ?? null;
}
