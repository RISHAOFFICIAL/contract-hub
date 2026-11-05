import { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

/* ============================================================
   Guide context: everything the Guide knows about this business
   ============================================================ */

export interface GuideContext {
  profile: {
    legalName: string | null;
    city: string | null;
    state: string | null;
    naics: string[];
    products: string[];
    services: string[];
  };
  registrations: { name: string; status: string; expiryDate: string | null }[];
  certifications: { name: string; program: string; status: string }[];
  contracts: {
    id: string;
    title: string;
    stage: string;
    deadline: string | null;
    daysUntilDeadline: number | null;
  }[];
  scansRun: number;
  savedSearches: number;
  lessonsCompleted: number;
  totalLessons: number;
}

export async function getGuideContext(
  supabase: Db,
  businessId: string
): Promise<GuideContext> {
  const [
    profileRes,
    regRes,
    certRes,
    contractRes,
    scanRes,
    searchRes,
    progressRes,
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("legal_name, city, state, naics_codes, product_lines, service_lines")
      .eq("id", businessId)
      .single(),
    supabase
      .from("registrations")
      .select("name, status, expiry_date")
      .eq("business_id", businessId)
      .order("name"),
    supabase
      .from("certifications")
      .select("name, program, status")
      .eq("business_id", businessId)
      .order("name"),
    supabase
      .from("contracts")
      .select("id, title, stage, deadline")
      .eq("business_id", businessId)
      .order("deadline", { ascending: true, nullsFirst: false }),
    supabase
      .from("scan_history")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId),
    supabase
      .from("saved_searches")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId),
    supabase
      .from("foundation_progress")
      .select("lesson_key", { count: "exact" })
      .eq("business_id", businessId)
      .eq("completed", true),
  ]);

  const p = (profileRes.data ?? {}) as {
    legal_name?: string | null;
    city?: string | null;
    state?: string | null;
    naics_codes?: string[] | null;
    product_lines?: string[] | null;
    service_lines?: string[] | null;
  };

  return {
    profile: {
      legalName: p.legal_name ?? null,
      city: p.city ?? null,
      state: p.state ?? null,
      naics: p.naics_codes ?? [],
      products: p.product_lines ?? [],
      services: p.service_lines ?? [],
    },
    registrations: ((regRes.data ?? []) as {
      name: string;
      status: string;
      expiry_date: string | null;
    }[]).map((r) => ({
      name: r.name,
      status: r.status,
      expiryDate: r.expiry_date,
    })),
    certifications: ((certRes.data ?? []) as {
      name: string;
      program: string;
      status: string;
    }[]).map((c) => ({ name: c.name, program: c.program, status: c.status })),
    contracts: ((contractRes.data ?? []) as {
      id: string;
      title: string;
      stage: string;
      deadline: string | null;
    }[]).map((c) => ({
      id: c.id,
      title: c.title,
      stage: c.stage,
      deadline: c.deadline,
      daysUntilDeadline: daysUntil(c.deadline),
    })),
    scansRun: scanRes.count ?? 0,
    savedSearches: searchRes.count ?? 0,
    lessonsCompleted: progressRes.count ?? 0,
    totalLessons: 9,
  };
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function formatShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "no date set";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "no date set";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ============================================================
   Top blocker: the single most important next action
   ============================================================ */

export interface Blocker {
  title: string;
  body: string;
  href: string;
  hrefLabel: string;
}

export function getTopBlocker(ctx: GuideContext): Blocker {
  // 1. Expired or inactive registration
  const badReg = ctx.registrations.find(
    (r) => r.status === "expired" || r.status === "inactive"
  );
  if (badReg) {
    return {
      title: `Fix this registration: ${badReg.name}`,
      body: `Your ${badReg.name} registration is ${badReg.status}. An expired or inactive registration blocks you from bidding and can hide your business from buyers. Fix it before you run scans or open the Workbench.`,
      href: "/app/registrations",
      hrefLabel: "Open registrations",
    };
  }

  // 2. Incomplete profile
  if (!ctx.profile.legalName || ctx.profile.legalName.trim() === "") {
    return {
      title: "Complete your business profile",
      body: "Everything in Contract Hub keys off your business profile. Add your legal business name, city, state, and NAICS codes so scans, the readiness meter, and certification guidance match your actual business.",
      href: "/app",
      hrefLabel: "Open dashboard",
    };
  }

  // 3. No registrations tracked
  if (ctx.registrations.length === 0) {
    return {
      title: "Track your SAM registration first",
      body: "SAM.gov is where federal buyers find and verify you. Add your SAM registration here (or start one free at sam.gov), then track its renewal date so it never lapses quietly.",
      href: "/app/registrations",
      hrefLabel: "Add a registration",
    };
  }

  // 4. No scan ever run
  if (ctx.scansRun === 0) {
    return {
      title: "Run your first opportunity scan",
      body: "You have saved searches set up but no scan has run yet. A scan matches your profile against open opportunities and drops the results in your Alerts inbox.",
      href: "/app/opportunities",
      hrefLabel: "Open opportunities",
    };
  }

  // 5. Contract deadline within 14 days, still watching or preparing
  const urgent = ctx.contracts.find(
    (c) =>
      (c.stage === "watching" || c.stage === "preparing") &&
      c.daysUntilDeadline !== null &&
      c.daysUntilDeadline <= 14
  );
  if (urgent) {
    const when =
      urgent.daysUntilDeadline !== null && urgent.daysUntilDeadline >= 0
        ? `Deadline is ${formatShort(urgent.deadline)}.`
        : `Deadline has passed (${formatShort(urgent.deadline)}).`;
    return {
      title: `Open the Workbench for ${urgent.title}`,
      body: `${when} This bid is in the ${urgent.stage} stage and time is short. Open it, review the compliance checklist, and decide today whether you will submit.`,
      href: "/app/contracts",
      hrefLabel: "Open contracts",
    };
  }

  // 6. Registration expiring within 90 days
  const expiring = ctx.registrations.find((r) => {
    const d = daysUntil(r.expiryDate);
    return d !== null && d >= 0 && d <= 90;
  });
  if (expiring) {
    return {
      title: `Renew ${expiring.name}`,
      body: `Your ${expiring.name} registration expires ${formatShort(
        expiring.expiryDate
      )}. Most renewals are free when you do them yourself at the official portal. Start now so a lapse never blocks a bid.`,
      href: "/app/registrations",
      hrefLabel: "Review renewals",
    };
  }

  // 7. Fallback
  return {
    title: "Explore your next certification",
    body: "Your foundations look solid. A certification like WOSB, HUBZone, or DBE can unlock set-aside contracts with less competition. See which programs fit your business and start the one that matches.",
    href: "/app/certifications",
    hrefLabel: "Open certifications",
  };
}

/* ============================================================
   Question answering: intent matching over the live context
   ============================================================ */

export interface GuideLink {
  label: string;
  href: string;
}

export interface GuideAnswer {
  title: string;
  body: string[];
  links?: GuideLink[];
  action?: GuideLink;
}

const DISCLAIMER = "General information, not legal advice.";

const PASSWORD_LIKE = /\bmy password is\b|\bpassword is\b|\bpassword\s*[:=]/i;

export function answerQuestion(
  ctx: GuideContext,
  question: string
): GuideAnswer {
  const q = question.toLowerCase().trim();
  const has = (...words: string[]) => words.some((w) => q.includes(w));

  // Safety: never collect passwords
  if (PASSWORD_LIKE.test(q) || (has("password") && has("is"))) {
    return {
      title: "Do not share passwords here",
      body: [
        "Contract Hub never asks for your passwords and never stores them. Do not type any password into this chat.",
        "If you need to sign in somewhere, go to that site directly and use your own login. If you already typed a password here, change it right away at the site it belongs to.",
      ],
    };
  }

  // What should I do this week
  if (
    has("this week", "my priority", "next step", "what should i do", "where do i start", "what do i do first")
  ) {
    const blocker = getTopBlocker(ctx);
    const paras = [
      `Your top priority right now: ${blocker.title}. ${blocker.body}`,
    ];
    const weekContracts = ctx.contracts.filter(
      (c) =>
        c.daysUntilDeadline !== null &&
        c.daysUntilDeadline >= 0 &&
        c.daysUntilDeadline <= 7
    );
    if (weekContracts.length > 0) {
      paras.push(
        `Deadlines this week: ${weekContracts
          .map((c) => `${c.title} (${formatShort(c.deadline)})`)
          .join(", ")}.`
      );
    } else {
      paras.push("No contract deadlines fall in the next 7 days.");
    }
    const renewals = ctx.registrations.filter((r) => {
      const d = daysUntil(r.expiryDate);
      return d !== null && d >= 0 && d <= 30;
    });
    if (renewals.length > 0) {
      paras.push(
        `Renewals due soon: ${renewals
          .map((r) => `${r.name} (${formatShort(r.expiryDate)})`)
          .join(", ")}.`
      );
    }
    paras.push(DISCLAIMER);
    return {
      title: "Your week at a glance",
      body: paras,
      action: { label: blocker.hrefLabel, href: blocker.href },
    };
  }

  // EIN
  if (has("ein", "employer identification", "tax id")) {
    return {
      title: "How to get an EIN",
      body: [
        "An EIN (Employer Identification Number) is free from the IRS. Apply online with the IRS EIN Assistant; most applicants get the number immediately at the end of the interview-style form. If you cannot apply online, file paper Form SS-4 by fax or mail instead.",
        "Save the confirmation letter (CP 575) the IRS issues. You will need the EIN for SAM registration, business bank accounts, and most certifications.",
        "Warning: many lookalike sites charge a fee to file an EIN for you. The real application is always free at irs.gov. Never pay a service for this.",
        DISCLAIMER,
      ],
      links: [
        {
          label: "Apply for an EIN online at IRS.gov",
          href: "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online",
        },
      ],
      action: { label: "Track your EIN in the vault", href: "/app/vault" },
    };
  }

  // SAM renewal
  if (
    (has("renew", "renewal") && has("sam")) ||
    has("sam renewal", "renew sam")
  ) {
    const sam = ctx.registrations.find((r) =>
      r.name.toLowerCase().includes("sam")
    );
    const paras = [
      "SAM.gov registration renews once a year and it is free. Sign in with your Login.gov account, open your entity registration, review and update every section (core data, assertions, reps and certs, points of contact), then submit. Give yourself a few weeks before expiry because validation can take time.",
      "Never pay a service to renew SAM for you. Renewal is free on sam.gov, and paid middlemen cannot do anything you cannot do yourself.",
    ];
    if (sam) {
      paras.push(
        `You are tracking a SAM record here with status ${sam.status}${
          sam.expiryDate ? `, expiring ${formatShort(sam.expiryDate)}` : ""
        }.`
      );
    } else {
      paras.push("You are not tracking a SAM registration in Contract Hub yet.");
    }
    paras.push(DISCLAIMER);
    return {
      title: "Renewing your SAM registration",
      body: paras,
      links: [
        {
          label: "SAM.gov entity registration",
          href: "https://sam.gov/content/entity-registration",
        },
      ],
      action: { label: "Open registrations", href: "/app/registrations" },
    };
  }

  // UEI / SAM registration
  if (has("uei", "sam.gov", "register on sam", "sam registration")) {
    return {
      title: "UEI and SAM.gov registration",
      body: [
        "The UEI (Unique Entity ID) is the 12-character identifier SAM.gov assigns to your business. Request it free at sam.gov with a Login.gov account. Getting a UEI alone is not the same as a full SAM registration.",
        "A full entity registration on SAM.gov makes you visible and eligible for federal awards. It requires your legal business name, physical address, EIN, UEI, NAICS codes, and banking details for payment. Registration is free and must be renewed every year.",
        "Never pay anyone for a UEI or SAM registration. Both are free on sam.gov.",
        DISCLAIMER,
      ],
      links: [
        {
          label: "SAM.gov entity registration",
          href: "https://sam.gov/content/entity-registration",
        },
      ],
      action: { label: "Track your registration", href: "/app/registrations" },
    };
  }

  // Business credit / DUNS
  if (
    has(
      "business credit",
      "build credit",
      "duns",
      "trade line",
      "net 30",
      "net-30",
      "credit tier"
    )
  ) {
    return {
      title: "Building business credit",
      body: [
        "Start at Tier 0: form your entity, keep your business name, address, and phone consistent everywhere, open a business bank account, and get a free DUNS number from Dun and Bradstreet. This foundation is what lenders and vendors verify first.",
        "Tier 1 is starter net-30 trade lines with vendors who report payments. Tier 2 is larger vendor accounts with higher limits. Tier 3 covers fleet cards and equipment financing. Tier 4 is bank lines of credit and SBA loans.",
        "The tier ladder is an educator planning framework, not an official rating system, and approval for any account is never guaranteed. Scam warnings: never pay for an EIN, UEI, DUNS number, or SAM renewal, and never use a CPN (credit privacy number).",
        DISCLAIMER,
      ],
      links: [
        {
          label: "Get a free DUNS number",
          href: "https://www.dnb.com/duns-number/get-a-duns.html",
        },
        { label: "SBA funding programs", href: "https://www.sba.gov/funding-programs" },
      ],
      action: { label: "Open Business Foundations", href: "/app/guide#foundations" },
    };
  }

  // Advertise / ad packages
  if (has("advertise", "ads", "ad package", "promote my business")) {
    return {
      title: "Advertising in Contract Hub",
      body: [
        "Contract Hub offers in-app ad packages so your business is seen by other owners in the Hub. Packages are Starter at $49, Featured at $99, and Spotlight at $199 per 30 days. Payments connect at launch, so packages are visible now and billing activates later.",
        "To create one, open the Ads section, pick a package, add your headline and business details, and submit it for review. Your ad goes live after approval and runs for 30 days.",
        DISCLAIMER,
      ],
      action: { label: "Open ad packages", href: "/app/ads" },
    };
  }

  // Margin / pricing
  if (has("margin", "how do i price", "pricing", "landed cost", "price my")) {
    return {
      title: "Pricing and the margin calculator",
      body: [
        "The margin calculator compares your price against your landed cost (product cost plus shipping, fees, and fulfillment). Margin above 10 percent is healthy. Under 10 percent is a warning to recheck your costs, and a negative margin means you lose money on every sale.",
        "For contract bids, work backward: know your true cost first, add the margin you need, then set the bid price. A low bid you cannot deliver profitably is worse than no bid.",
        DISCLAIMER,
      ],
      action: { label: "Open opportunities", href: "/app/opportunities" },
    };
  }

  // Talk to update
  if (has("talk to update", "update a contract", "voice update", "contract card")) {
    return {
      title: "Talk to update a contract",
      body: [
        "Every contract card has a Talk to update control. Type or speak an instruction like 'move this to preparing and set the deadline to Friday' and the app shows you exactly what it will change.",
        "Nothing changes until you tap Confirm on the confirmation card. If you decline, the contract stays exactly as it was. It is a safe way to keep contract details current without hunting through forms.",
        DISCLAIMER,
      ],
      action: { label: "Open contracts", href: "/app/contracts" },
    };
  }

  // Certifications
  if (has("certification", "certifications", "wosb", "hubzone", "dbe", "mbe", "8(a)")) {
    const tracked = ctx.certifications.map(
      (c) => `${c.name} (${c.status.replace("_", " ")})`
    );
    const paras = [
      "Certifications unlock set-aside contracts with less competition. In plain language: WOSB is for woman-owned small businesses, EDWOSB adds an economically disadvantaged test, HUBZone is for businesses in historically underutilized areas, DBE is for disadvantaged businesses on transportation work, and MBE is a state and corporate supplier-diversity designation.",
      "Most programs ask for your EIN, SAM registration, business formation documents, and proof of ownership and control. Start with the one that matches your situation, gather the documents once, and reuse them across applications.",
    ];
    if (tracked.length > 0) {
      paras.push(`You are tracking: ${tracked.join(", ")}.`);
    } else {
      paras.push("You are not tracking any certifications yet.");
    }
    paras.push(DISCLAIMER);
    return {
      title: "Which certifications fit your business",
      body: paras,
      action: { label: "Open certifications", href: "/app/certifications" },
    };
  }

  // Fallback
  return {
    title: "What the Guide covers",
    body: [
      "I can help with your weekly priorities, SAM.gov registration and renewal, getting an EIN or UEI, building business credit, certifications that fit your business, pricing and margins, advertising in the Hub, and updating contracts with Talk to update.",
      "Try one of the suggested questions below, or ask in your own words and I will point you to the right section.",
    ],
  };
}
