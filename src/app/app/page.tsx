import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Registration = {
  id: string;
  name: string;
  status: string;
  expiry_date: string | null;
};

type Contract = {
  id: string;
  title: string;
  deadline: string | null;
  stage: string;
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, legal_name, city, state")
    .order("created_at", { ascending: true })
    .limit(1);

  const business = businesses?.[0] ?? null;
  const businessId = business?.id ?? null;

  let registrations: Registration[] = [];
  let contracts: Contract[] = [];
  let counts = {
    certifications: 0,
    savedSearches: 0,
    scans: 0,
    suppliers: 0,
    lessonsDone: 0,
  };

  if (businessId) {
    const [regRes, conRes, certRes, searchRes, scanRes, supRes, lesRes] =
      await Promise.all([
        supabase
          .from("registrations")
          .select("id, name, status, expiry_date")
          .eq("business_id", businessId),
        supabase
          .from("contracts")
          .select("id, title, deadline, stage")
          .eq("business_id", businessId)
          .order("deadline", { ascending: true, nullsFirst: false }),
        supabase
          .from("certifications")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("saved_searches")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("scan_history")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("suppliers")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("foundation_progress")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("completed", true),
      ]);
    registrations = (regRes.data ?? []) as Registration[];
    contracts = (conRes.data ?? []) as Contract[];
    counts = {
      certifications: certRes.count ?? 0,
      savedSearches: searchRes.count ?? 0,
      scans: scanRes.count ?? 0,
      suppliers: supRes.count ?? 0,
      lessonsDone: lesRes.count ?? 0,
    };
  }

  // Readiness meter: weighted checklist, 0 to 100
  const profileDone = Boolean(business?.legal_name);
  const hasRegistration = registrations.length > 0;
  const hasActiveReg = registrations.some((r) => r.status === "active");
  const readiness = Math.min(
    100,
    (profileDone ? 15 : 0) +
      (hasRegistration ? 15 : 0) +
      (hasActiveReg ? 15 : 0) +
      (counts.certifications > 0 ? 10 : 0) +
      (counts.savedSearches > 0 ? 10 : 0) +
      (counts.scans > 0 ? 10 : 0) +
      (contracts.length > 0 ? 10 : 0) +
      (counts.lessonsDone > 0 ? 10 : 0) +
      (counts.suppliers > 0 ? 5 : 0)
  );

  // Blocker priority: an expired or inactive registration outranks everything
  const badRegistration = registrations.find((r) =>
    ["expired", "inactive"].includes(r.status)
  );

  let welcomeTitle: string;
  let welcomeBody: string;
  if (!profileDone) {
    welcomeTitle = "Set up your business profile";
    welcomeBody =
      "Add your legal name, location, NAICS codes, and product lines. Your profile drives your opportunity matches.";
  } else if (badRegistration) {
    welcomeTitle = `Fix this registration: ${badRegistration.name}`;
    welcomeBody = `Your ${badRegistration.name} registration is ${badRegistration.status}. Nothing else matters until this is active, because most bids require it.`;
  } else if (!hasRegistration) {
    welcomeTitle = "Track your first registration";
    welcomeBody =
      "Start with SAM.gov for federal work or your state vendor portal. Renewals and eligibility stay visible here.";
  } else if (counts.savedSearches === 0) {
    welcomeTitle = "Run your first opportunity scan";
    welcomeBody =
      "Save a search with your keywords and NAICS codes. The Hub scans official sources every morning and alerts you to matches.";
  } else if (contracts.length === 0) {
    welcomeTitle = "Track your first bid";
    welcomeBody =
      "When a scan finds a fit, track it. The Hub follows it from watching to closeout.";
  } else {
    welcomeTitle = "You are building momentum";
    welcomeBody =
      "Keep your registrations current, review new alerts each morning, and move pursuits through the pipeline.";
  }

  // Renewals within 90 days (or already past due)
  const renewals = registrations
    .map((r) => ({ ...r, days: daysUntil(r.expiry_date) }))
    .filter((r) => r.days !== null && r.days <= 90)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));

  // Contract deadlines within 14 days
  const upcoming = contracts
    .map((c) => ({ ...c, days: daysUntil(c.deadline) }))
    .filter((c) => c.days !== null && c.days <= 14 && c.days >= 0)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));

  const displayName =
    business?.legal_name ??
    (user?.email ? user.email.split("@")[0] : "there");

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-dark">
            Contract Hub
          </p>
          <h1 className="font-display text-3xl font-semibold text-forest">
            Hello, {displayName}
          </h1>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="btn-glass glass px-4 py-2 text-sm font-semibold text-forest"
          >
            Sign out
          </button>
        </form>
      </header>

      {/* Welcome panel: follows real progress */}
      <section className="glass rounded-3xl p-6">
        <h2 className="font-display text-xl font-semibold text-forest">
          {welcomeTitle}
        </h2>
        <p className="mt-2 text-ink-soft">{welcomeBody}</p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-ink-soft">Bid readiness</span>
            <span className="text-forest">{readiness}%</span>
          </div>
          <div className="meter-track mt-2 h-3">
            <div className="meter-fill h-3" style={{ width: `${readiness}%` }} />
          </div>
        </div>
        {!profileDone ? (
          <Link
            href="/app/profile"
            className="btn-glass btn-primary-glass mt-4 inline-block px-5 py-2 text-sm"
          >
            Complete your business profile
          </Link>
        ) : (
          <Link
            href="/app/profile"
            className="mt-4 inline-block text-sm font-semibold text-brass-dark"
          >
            Edit business profile
          </Link>
        )}
      </section>

      {/* Guide card */}
      <section className="glass-brass rounded-3xl p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-dark">
          Your Guide says
        </p>
        <p className="mt-2 font-display text-lg font-semibold text-forest">
          {welcomeTitle}
        </p>
        <p className="mt-1 text-sm text-ink-soft">{welcomeBody}</p>
        <Link
          href="/app/guide"
          className="btn-glass btn-primary-glass mt-4 inline-block px-5 py-2 text-sm"
        >
          Open the Guide
        </Link>
      </section>

      {/* Renewals */}
      <section className="card-lux p-6">
        <h2 className="font-display text-lg font-semibold text-forest">
          Renewals
        </h2>
        {renewals.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">
            No renewals due in the next 90 days. Tracked registrations will
            appear here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {renewals.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl bg-ivory px-4 py-3"
              >
                <span className="text-sm font-medium text-ink">{r.name}</span>
                <span
                  className={`pill ${
                    (r.days ?? 0) < 0 ? "pill-bad" : "pill-warn"
                  }`}
                >
                  {(r.days ?? 0) < 0
                    ? `Past due by ${Math.abs(r.days ?? 0)}d`
                    : `${r.days}d left`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Deadlines */}
      <section className="card-lux p-6">
        <h2 className="font-display text-lg font-semibold text-forest">
          Upcoming deadlines
        </h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">
            No bid deadlines in the next 14 days. Tracked contracts will
            appear here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcoming.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl bg-ivory px-4 py-3"
              >
                <span className="text-sm font-medium text-ink">{c.title}</span>
                <span className="pill pill-active">{c.days}d left</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Snapshot counts */}
      <section className="grid grid-cols-2 gap-3">
        {[
          { label: "Contracts tracked", value: contracts.length },
          { label: "Registrations", value: registrations.length },
          { label: "Certifications", value: counts.certifications },
          { label: "Saved searches", value: counts.savedSearches },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4 text-center">
            <p className="font-display text-2xl font-semibold text-forest">
              {s.value}
            </p>
            <p className="text-xs font-medium text-ink-faint">{s.label}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
