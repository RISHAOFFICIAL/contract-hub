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
 * Words too generic to match on their own. Without this list, a word
 * like "services" or "department" would match nearly every listing.
 */
const WORD_STOPLIST = new Set([
  "services",
  "service",
  "supplies",
  "supply",
  "products",
  "product",
  "systems",
  "system",
  "general",
  "public",
  "management",
  "program",
  "programs",
  "office",
  "business",
  "state",
  "county",
  "city",
  "michigan",
  "detroit",
  "department",
  "contract",
  "contracts",
  "procurement",
]);

/**
 * Significant single words (5 or more letters, not stop-listed) from
 * expanded terms. Used as a fallback when no whole phrase matches:
 * "cleaning services" should still catch "Cleaning and Maintenance".
 */
function matchWords(terms: TermInfo[]): { word: string; via: string | null }[] {
  const out: { word: string; via: string | null }[] = [];
  const seen = new Set<string>();
  for (const t of terms) {
    for (const w of t.term.toLowerCase().split(/[^a-z0-9]+/)) {
      if (w.length < 5 || WORD_STOPLIST.has(w) || seen.has(w)) continue;
      seen.add(w);
      out.push({ word: w, via: t.via });
    }
  }
  return out;
}

/**
 * Score an opportunity 0 to 100 against the business profile.
 * Title term match +40, description match +25, NAICS prefix match +25,
 * synonym match +10 bonus. When no whole phrase matches, a significant
 * single word in the title (+40) or description (+25) counts instead.
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

  // Word fallback: no whole phrase matched, so try significant words.
  const words = titleTerm == null && descTerm == null ? matchWords(terms) : [];
  const titleWord =
    words.find((w) => title.includes(w.word)) ?? null;
  const descWord =
    titleWord == null
      ? words.find((w) => desc.includes(w.word)) ?? null
      : null;

  if (titleTerm) {
    score += 40;
    reasons.push(`Title matches '${titleTerm.term}'`);
  } else if (descTerm) {
    score += 25;
    reasons.push(`Description matches '${descTerm.term}'`);
  } else if (titleWord) {
    score += 40;
    reasons.push(`Title matches '${titleWord.word}'`);
  } else if (descWord) {
    score += 25;
    reasons.push(`Description matches '${descWord.word}'`);
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

  const viaSynonym =
    titleTerm?.via ?? descTerm?.via ?? titleWord?.via ?? descWord?.via ?? null;
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
  source_name: string;
  source_url: string;
  type: "active_bid" | "upcoming" | "rfi" | "sources_sought" | "presolicitation";
  level: string;
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
    level: "federal",
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

/* ---------- Shared fetch helpers ---------- */

const FETCH_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ContractHub/1.0";

/** Decode the handful of HTML entities that show up in feeds and pages. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_m, code: string) =>
      String.fromCharCode(Number(code))
    )
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, code: string) =>
      String.fromCharCode(parseInt(code, 16))
    );
}

/** "2026-11-10 22:00:00" (UTC) to ISO string, or null. */
function utcDateTimeToIso(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(
    Date.UTC(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6])
    )
  );
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** "11/24/2026" to an ISO date string, or null. */
function usDateToIso(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}T00:00:00.000Z`;
}

/* ---------- Detroit Bonfire fetching ---------- */

type BonfireProject = {
  ProjectID?: string;
  ReferenceID?: string;
  ProjectName?: string;
  DateClose?: string;
  DepartmentID?: string;
};

type BonfireRssItem = {
  projectId: string;
  title: string;
  description: string | null;
  postedDate: string | null;
};

function parseBonfireRss(xml: string): BonfireRssItem[] {
  const items: BonfireRssItem[] = [];
  const blocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  for (const block of blocks) {
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "";
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "";
    const desc = block.match(/<description>([\s\S]*?)<\/description>/)?.[1];
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
    const projectId = link.match(/\/opportunities\/(\d+)/)?.[1] ?? "";
    if (!projectId || !title) continue;
    const cleanDesc = desc
      ? decodeEntities(desc.replace(/Project closes [^.]*\./, "").trim())
      : null;
    const posted = pubDate ? new Date(pubDate.trim()) : null;
    items.push({
      projectId,
      title: decodeEntities(title.trim()).replace(/\s+/g, " "),
      description: cleanDesc && cleanDesc.length > 0 ? cleanDesc : null,
      postedDate:
        posted && !Number.isNaN(posted.getTime())
          ? posted.toISOString()
          : null,
    });
  }
  return items;
}

/**
 * Query the City of Detroit Bonfire portal for open opportunities.
 * No key, no login. Uses the portal's own anonymous JSON endpoint
 * (structured close dates) joined with the public RSS feed
 * (descriptions). Falls back to whichever one answers.
 * Returns [] on any failure; never throws.
 */
export async function fetchBonfireOpportunities(
  keywords: string
): Promise<RawOpp[]> {
  try {
    const [jsonRes, rssRes] = await Promise.allSettled([
      fetch(
        "https://detroit.bonfirehub.com/PublicPortal/getOpenPublicOpportunitiesSectionData",
        { cache: "no-store", headers: { "User-Agent": FETCH_UA } }
      ),
      fetch("https://detroit.bonfirehub.com/opportunities/rss", {
        cache: "no-store",
        headers: { "User-Agent": FETCH_UA },
      }),
    ]);

    const projects = new Map<string, BonfireProject>();
    if (jsonRes.status === "fulfilled" && jsonRes.value.ok) {
      const data = (await jsonRes.value.json()) as {
        payload?: { projects?: Record<string, BonfireProject> };
      };
      const listed = data?.payload?.projects ?? {};
      for (const p of Object.values(listed)) {
        if (p?.ProjectID) projects.set(p.ProjectID, p);
      }
    }

    const rssById = new Map<string, BonfireRssItem>();
    if (rssRes.status === "fulfilled" && rssRes.value.ok) {
      const xml = await rssRes.value.text();
      for (const item of parseBonfireRss(xml)) {
        rssById.set(item.projectId, item);
      }
    }

    // If the JSON endpoint answered, it is the source of truth for the
    // open set. If only RSS answered, build from RSS alone.
    const ids = Array.from(
      new Set([...Array.from(projects.keys()), ...Array.from(rssById.keys())])
    );
    if (ids.length === 0) return [];

    const terms = keywords.trim()
      ? expandTerms([keywords.trim()])
      : [];
    const words = matchWords(terms);
    const out: RawOpp[] = [];
    for (const id of ids) {
      const p = projects.get(id);
      const rss = rssById.get(id);
      const title = p?.ProjectName ?? rss?.title ?? "";
      if (!title) continue;
      const description = rss?.description ?? null;
      if (terms.length > 0) {
        const haystack = `${title} ${description ?? ""}`.toLowerCase();
        const phraseHit = terms.some((t) => haystack.includes(t.term));
        const wordHit = words.some((w) => haystack.includes(w.word));
        if (!phraseHit && !wordHit) continue;
      }
      const refMatch = rss?.title.match(/Reference #: (\d+)\. Name: (.*)/);
      out.push({
        title: refMatch ? refMatch[2].trim() : title,
        buyer: "City of Detroit",
        source_name: "Detroit Bonfire",
        source_url: `https://detroit.bonfirehub.com/opportunities/${id}`,
        type: "active_bid",
        level: "city",
        posted_date: rss?.postedDate ?? null,
        deadline: utcDateTimeToIso(p?.DateClose),
        naics: null,
        set_aside: null,
        solicitation_number: p?.ReferenceID ?? refMatch?.[1] ?? null,
        description,
      });
    }
    return out;
  } catch (err) {
    console.error("Bonfire search error", err);
    return [];
  }
}

/* ---------- MITN (BidNet Direct) fetching ---------- */

const MITN_BASE = "https://www.bidnetdirect.com/mitn/solicitations/open-bids";

type MitnRow = {
  title: string;
  url: string;
  published: string | null;
  closing: string | null;
};

function parseMitnRows(htmlText: string): MitnRow[] {
  const rows: MitnRow[] = [];
  const blocks =
    htmlText.match(/<tr[^>]*data-index="\d+"[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  for (const block of blocks) {
    // The anchor text can contain a highlight span around the search
    // keyword, so capture the inner HTML and strip tags after.
    const link = block.match(
      /<a[^>]*href="([^"]*\/mitn\/solicitations\/open-bids\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/
    );
    if (!link) continue;
    const title = decodeEntities(
      link[2].replace(/<[^>]+>/g, "").trim()
    ).replace(/\s+/g, " ");
    if (!title) continue;
    const published =
      block.match(/Published[^0-9]*(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1] ?? null;
    const closing =
      block.match(/Closing[^0-9]*(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1] ?? null;
    const href = decodeEntities(link[1]);
    rows.push({
      title,
      url: href.startsWith("http")
        ? href
        : `https://www.bidnetdirect.com${href}`,
      published: usDateToIso(published),
      closing: usDateToIso(closing),
    });
  }
  return rows;
}

/**
 * Query MITN (Michigan Intergovernmental Trade Network, BidNet Direct)
 * for open bids. No login needed to list titles and deadlines; the
 * buyer, solicitation number, and description are locked behind a
 * free BidNet account, so those fields stay empty and the description
 * says so plainly. Returns [] on any failure; never throws.
 */
export async function fetchMitnOpportunities(
  keywords: string
): Promise<RawOpp[]> {
  try {
    const q = keywords.trim();
    const firstUrl = q
      ? `${MITN_BASE}?keywords=${encodeURIComponent(q)}`
      : MITN_BASE;
    const pages: string[] = [firstUrl];
    // Keyword searches rarely fill a page; without keywords the open
    // set spans about 8 pages, so cap at 2 pages either way.
    pages.push(q ? `${firstUrl}&page=2` : `${MITN_BASE}/page2`);

    const seen = new Set<string>();
    const out: RawOpp[] = [];
    for (const url of pages) {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { "User-Agent": FETCH_UA },
      });
      if (!res.ok) {
        console.error("MITN search failed", res.status);
        continue;
      }
      const rows = parseMitnRows(await res.text());
      if (rows.length === 0) break;
      for (const row of rows) {
        if (seen.has(row.url)) continue;
        seen.add(row.url);
        out.push({
          title: row.title,
          buyer: null,
          source_name: "MITN",
          source_url: row.url,
          type: "active_bid",
          level: "local",
          posted_date: row.published,
          deadline: row.closing,
          naics: null,
          set_aside: null,
          solicitation_number: null,
          description:
            "Buyer, solicitation number, and documents need a free BidNet account. View the full listing on BidNet.",
        });
      }
      if (rows.length < 37) break;
    }
    return out;
  } catch (err) {
    console.error("MITN search error", err);
    return [];
  }
}

/* ---------- Running a scan ---------- */

export type SavedSearchTarget = {
  id?: string;
  name?: string | null;
  keywords?: string | null;
};

export type FilteredOut = { title: string; reason: string; source?: string };

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
  // SAM.gov, Detroit Bonfire, and MITN in parallel. Each fetcher
  // returns [] on failure, so one source going down never blocks
  // the others. Michigan SIGMA has no server-side method and is
  // surfaced as a manual check on the Opportunities page instead.
  const [samFound, bonfireFound, mitnFound] = await Promise.all([
    keywords ? fetchSamOpportunities(keywords) : Promise.resolve([]),
    fetchBonfireOpportunities(keywords),
    fetchMitnOpportunities(keywords),
  ]);
  const found: RawOpp[] = [...samFound, ...bonfireFound, ...mitnFound];

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
        source: raw.source_name,
      });
      continue;
    }
    const dedupeKey = `${raw.source_url}|||${raw.solicitation_number ?? ""}`;
    if (seen.has(dedupeKey)) {
      filteredOut.push({
        title: raw.title,
        reason: "Already in your opportunities",
        source: raw.source_name,
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
      level: raw.level,
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

  const sourceNames = ["SAM.gov", "Detroit Bonfire", "MITN"];
  const perSource: Record<
    string,
    {
      found: number;
      filtered: number;
      added: number;
      filteredOut: FilteredOut[];
    }
  > = {};
  for (const name of sourceNames) {
    perSource[name] = {
      found: found.filter((r) => r.source_name === name).length,
      filtered: filteredOut.filter((f) => f.source === name).length,
      added: toInsert.filter((r) => r.source_name === name).length,
      filteredOut: filteredOut.filter((f) => f.source === name),
    };
  }

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
    sources_checked: ["SAM.gov", "Detroit Bonfire", "MITN"],
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
