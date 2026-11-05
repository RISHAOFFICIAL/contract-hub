// Server-side only scan library for Contract Hub opportunities.
// Shared by the opportunities inbox, the cron worker, and manual scans.

import { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

/* ---------- Synonym expansion ---------- */

export const SYNONYMS: Record<string, string[]> = {
  janitorial: ["custodial", "cleaning services", "housekeeping", "janitor"],
  cleaning: ["janitorial", "custodial", "housekeeping", "sanitation"],
  "office supplies": ["office products", "stationery", "toner", "paper products"],
  paper: ["copy paper", "tissue", "paper products"],
  ppe: ["personal protective equipment", "safety supplies", "gloves", "masks"],
  "food service": ["catering", "cafeteria", "meal service", "food"],
  catering: ["food service", "meals", "banquet"],
  maintenance: ["facilities maintenance", "repair", "preventive maintenance"],
  it: ["information technology", "computer services", "software", "network"],
  construction: ["general contractor", "renovation", "build", "building construction"],
  landscaping: ["grounds maintenance", "lawn care", "lawn"],
  security: ["guard services", "security guard", "surveillance"],
  plumbing: ["pipe", "plumber", "water systems"],
  electrical: ["electrician", "wiring", "lighting"],
  hvac: ["heating", "ventilation", "air conditioning"],
};

type TermInfo = { term: string; via: string | null };

/** Expand profile keywords with synonyms. `via` names the original keyword a synonym came from. */
export function expandTerms(keywords: string[]): TermInfo[] {
  const infos: TermInfo[] = [];
  const seen = new Set<string>();

  const add = (term: string, via: string | null) => {
    if (term && !seen.has(term)) {
      seen.add(term);
      infos.push({ term, via });
    }
  };

  for (const kw of keywords) {
    const phrase = kw.trim().toLowerCase();
    if (!phrase) continue;
    add(phrase, null);
    const phraseSyns = SYNONYMS[phrase];
    if (phraseSyns) phraseSyns.forEach((s) => add(s, phrase));
    for (const word of phrase.split(/[\s,;]+/)) {
      const wordSyns = SYNONYMS[word];
      if (wordSyns) wordSyns.forEach((s) => add(s, word));
    }
  }
  return infos;
}

/* ---------- Scoring ---------- */

export type OpportunityInput = {
  title: string;
  description?: string | null;
  naics?: string | null;
};

export type ProfileInput = {
  keywords: string[];
  naicsCodes: string[];
};

/**
 * Score an opportunity 0 to 100 against the business profile.
 * Title term match +40, description match +25, NAICS prefix match +25,
 * synonym match +10 bonus.
 */
export function scoreOpportunity(
  opp: OpportunityInput,
  profile: ProfileInput
): { score: number; reason: string } {
  const reasons: string[] = [];
  let score = 0;

  const title = (opp.title ?? "").toLowerCase();
  const desc = (opp.description ?? "").toLowerCase();
  const terms = expandTerms(profile.keywords);

  const titleTerm = terms.find((t) => title.includes(t.term)) ?? null;
  const descTerm =
    titleTerm == null
      ? terms.find((t) => desc.includes(t.term)) ?? null
      : null;

  if (titleTerm) {
    score += 40;
    reasons.push(`Title matches '${titleTerm.term}'`);
  } else if (descTerm) {
    score += 25;
    reasons.push(`Description matches '${descTerm.term}'`);
  }

  const oppNaics = (opp.naics ?? "").replace(/\D/g, "");
  const matchedProfileNaics = profile.naicsCodes.find((code) => {
    const digits = code.replace(/\D/g, "");
    return digits.length >= 4 && oppNaics.startsWith(digits.slice(0, 4));
  });
  if (oppNaics && matchedProfileNaics) {
    score += 25;
    reasons.push(`NAICS ${oppNaics} in your profile`);
  }

  const viaSynonym = titleTerm?.via ?? descTerm?.via ?? null;
  if (viaSynonym) {
    score += 10;
    reasons.push(`related to '${viaSynonym}'`);
  }

  return {
    score: Math.min(100, score),
    reason: reasons.length > 0 ? reasons.join("; ") : "No match",
  };
}

/* ---------- SAM.gov fetching ---------- */

export type RawOpp = {
  title: string;
  buyer: string | null;
  source_name: "SAM.gov";
  source_url: string;
  type: "active_bid" | "upcoming" | "rfi" | "sources_sought" | "presolicitation";
  posted_date: string | null;
  deadline: string | null;
  naics: string | null;
  set_aside: string | null;
  solicitation_number: string | null;
  description: string | null;
};

function mapSamType(ptype: string | null | undefined): RawOpp["type"] {
  switch ((ptype ?? "").toLowerCase()) {
    case "o":
    case "k":
      return "active_bid";
    case "p":
      return "presolicitation";
    case "r":
      return "sources_sought";
    case "s":
      return "upcoming";
    default:
      return "active_bid";
  }
}

type SamNotice = {
  noticeId?: string;
  title?: string;
  solicitationNumber?: string;
  fullParentPathName?: string;
  organization?: string;
  postedDate?: string;
  responseDeadLine?: string;
  naicsCodes?: string[];
  typeOfSetAsideDescription?: string;
  ptype?: string;
  description?: string;
};

function mapSamNotice(n: SamNotice): RawOpp | null {
  const noticeId = n.noticeId ?? null;
  if (!n.title || !noticeId) return null;
  return {
    title: n.title,
    buyer: n.fullParentPathName ?? n.organization ?? null,
    source_name: "SAM.gov",
    source_url: `https://sam.gov/opp/${noticeId}/view`,
    type: mapSamType(n.ptype),
    posted_date: n.postedDate ?? null,
    deadline: n.responseDeadLine ?? null,
    naics: n.naicsCodes?.[0] ?? null,
    set_aside: n.typeOfSetAsideDescription ?? null,
    solicitation_number: n.solicitationNumber ?? null,
    description: n.description ?? null,
  };
}

/**
 * Query the SAM.gov public opportunities search API for the last 30 days.
 * Returns [] on any failure; never throws.
 */
export async function fetchSamOpportunities(
  keywords: string
): Promise<RawOpp[]> {
  try {
    const fmt = (d: Date) =>
      `${String(d.getMonth() + 1).padStart(2, "0")}/${String(
        d.getDate()
      ).padStart(2, "0")}/${d.getFullYear()}`;
    const now = new Date();
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let url =
      `https://api.sam.gov/opportunities/v2/search` +
      `?limit=25` +
      `&q=${encodeURIComponent(keywords)}` +
      `&postedFrom=${fmt(from)}&postedTo=${fmt(now)}` +
      `&ptype=o`;
    const apiKey = process.env.SAM_API_KEY;
    if (apiKey) url += `&api_key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error("SAM.gov search failed", res.status);
      return [];
    }
    const data = (await res.json()) as { opportunitiesData?: SamNotice[] };
    const list = Array.isArray(data?.opportunitiesData)
      ? data.opportunitiesData
      : [];
    const mapped: RawOpp[] = [];
    for (const n of list) {
      const opp = mapSamNotice(n);
      if (opp) mapped.push(opp);
    }
    return mapped;
  } catch (err) {
    console.error("SAM.gov search error", err);
    return [];
  }
}

/* ---------- Running a scan ---------- */

export type SavedSearchTarget = {
  id?: string;
  name?: string | null;
  keywords?: string | null;
};

export type FilteredOut = { title: string; reason: string };

export type ScanSummary = {
  found: number;
  filtered: number;
  added: number;
  filteredOut: FilteredOut[];
  perSource: Record<string, unknown>;
};

const SCORE_THRESHOLD = 40;

/**
 * Run one saved search (or ad hoc keywords): fetch from SAM.gov, score each
 * result against the business profile, insert passing ones as new
 * opportunities, log the run to scan_history, alert on new additions,
 * and bump the saved search last_run_at.
 */
export async function runScanForSearch(
  supabase: Db,
  businessId: string,
  search: SavedSearchTarget
): Promise<ScanSummary> {
  const keywords = (search.keywords ?? "").trim();
  const found: RawOpp[] = keywords
    ? await fetchSamOpportunities(keywords)
    : [];

  // Read the business profile for scoring.
  const { data: business } = await supabase
    .from("businesses")
    .select("naics_codes, product_lines, service_lines")
    .eq("id", businessId)
    .single();
  const profile: ProfileInput = {
    keywords: [
      ...((business?.product_lines as string[] | null) ?? []),
      ...((business?.service_lines as string[] | null) ?? []),
    ],
    naicsCodes: (business?.naics_codes as string[] | null) ?? [],
  };

  // Existing opportunities for dedupe (unique on business_id, source_url, solicitation_number).
  const { data: existing } = await supabase
    .from("opportunities")
    .select("source_url, solicitation_number")
    .eq("business_id", businessId);
  const seen = new Set(
    (existing ?? []).map(
      (e: { source_url: string | null; solicitation_number: string | null }) =>
        `${e.source_url ?? ""}|||${e.solicitation_number ?? ""}`
    )
  );

  const filteredOut: FilteredOut[] = [];
  const toInsert: Array<{
    business_id: string;
    title: string;
    buyer: string | null;
    source_name: string;
    source_url: string;
    type: string;
    level: string;
    posted_date: string | null;
    deadline: string | null;
    naics: string | null;
    set_aside: string | null;
    match_reason: string;
    match_score: number;
    status: string;
    solicitation_number: string | null;
    raw_data: Record<string, unknown>;
  }> = [];

  for (const raw of found) {
    const { score, reason } = scoreOpportunity(
      { title: raw.title, description: raw.description, naics: raw.naics },
      profile
    );
    if (score < SCORE_THRESHOLD) {
      filteredOut.push({
        title: raw.title,
        reason: `Score ${score}/100 is below the ${SCORE_THRESHOLD} point bar (${reason})`,
      });
      continue;
    }
    const dedupeKey = `${raw.source_url}|||${raw.solicitation_number ?? ""}`;
    if (seen.has(dedupeKey)) {
      filteredOut.push({
        title: raw.title,
        reason: "Already in your opportunities",
      });
      continue;
    }
    seen.add(dedupeKey);
    toInsert.push({
      business_id: businessId,
      title: raw.title,
      buyer: raw.buyer,
      source_name: raw.source_name,
      source_url: raw.source_url,
      type: raw.type,
      level: "federal",
      posted_date: raw.posted_date,
      deadline: raw.deadline,
      naics: raw.naics,
      set_aside: raw.set_aside,
      match_reason: reason,
      match_score: score,
      status: "new",
      solicitation_number: raw.solicitation_number,
      raw_data: { description: raw.description },
    });
  }

  const insertedIds: string[] = [];
  for (const row of toInsert) {
    const { data } = await supabase
      .from("opportunities")
      .insert(row)
      .select("id")
      .single();
    if (data?.id) insertedIds.push(data.id as string);
  }

  // Alerts for each new opportunity.
  for (let i = 0; i < toInsert.length; i++) {
    const oppId = insertedIds[i];
    if (!oppId) continue;
    await supabase.from("alerts").insert({
      business_id: businessId,
      type: "opportunity",
      title: `New match: ${toInsert[i].title}`,
      body: [
        toInsert[i].buyer ? `Buyer: ${toInsert[i].buyer}` : null,
        `Match score: ${toInsert[i].match_score}/100`,
        toInsert[i].match_reason,
      ]
        .filter(Boolean)
        .join(". "),
      related_id: oppId,
      related_table: "opportunities",
    });
  }

  const perSource = {
    "SAM.gov": {
      found: found.length,
      filtered: filteredOut.length,
      added: toInsert.length,
      filteredOut,
    },
  };

  if (search.id) {
    await supabase
      .from("saved_searches")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", search.id)
      .eq("business_id", businessId);
  }

  await supabase.from("scan_history").insert({
    business_id: businessId,
    saved_search_id: search.id ?? null,
    sources_checked: ["SAM.gov"],
    found_count: found.length,
    filtered_count: filteredOut.length,
    added_count: toInsert.length,
    per_source: perSource,
  });

  return {
    found: found.length,
    filtered: filteredOut.length,
    added: toInsert.length,
    filteredOut,
    perSource,
  };
}
