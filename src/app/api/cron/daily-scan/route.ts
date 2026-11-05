import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runScanForSearch } from "@/lib/scan";
import { checkDeadlines } from "@/lib/alerts";

type SearchRow = {
  id: string;
  name: string;
  keywords: string | null;
  frequency: string;
  last_run_at: string | null;
  is_active: boolean;
};

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "service role not configured" },
      { status: 500 }
    );
  }

  const supabase = createClient(url, serviceKey);
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  let searchesRun = 0;
  let opportunitiesAdded = 0;
  let alertsCreated = 0;

  const { data: businesses, error: bizError } = await supabase
    .from("businesses")
    .select("id");
  if (bizError) {
    return NextResponse.json(
      { ok: false, error: "business query failed" },
      { status: 500 }
    );
  }

  for (const b of businesses ?? []) {
    const { data: searches } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("business_id", b.id)
      .eq("is_active", true);

    for (const s of ((searches ?? []) as SearchRow[])) {
      const due =
        s.frequency === "daily" ||
        (s.frequency === "weekly" &&
          (!s.last_run_at || s.last_run_at < sevenDaysAgo));
      if (!due) continue;
      const summary = await runScanForSearch(supabase, b.id, {
        id: s.id,
        name: s.name,
        keywords: s.keywords,
      });
      searchesRun += 1;
      opportunitiesAdded += summary.added;
    }

    alertsCreated += await checkDeadlines(supabase, b.id);
  }

  return NextResponse.json({
    ok: true,
    businesses: businesses?.length ?? 0,
    searchesRun,
    opportunitiesAdded,
    alertsCreated,
  });
}
