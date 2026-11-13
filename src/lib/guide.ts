import { createClient } from "@/lib/supabase/server";
import { LESSONS } from "@/lib/foundations";

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
    totalLessons: LESSONS.length,
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
      href: "/app/profile",
      hrefLabel: "Complete your profile",
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

  // Best bank for a business account
  if (
    has(
      "best bank",
      "which bank",
      "what bank",
      "what banks",
      "bank should",
      "bank do i",
      "bank to use",
      "business bank",
      "business bank account",
      "open a bank account",
      "bank for my business",
      "choose a bank",
      "checking account"
    )
  ) {
    return {
      title: "Best banks for a business bank account",
      body: [
        "There is no single best bank; the right one fits how your business actually operates. Compare monthly fees and how to waive them, the minimum opening deposit and balance, monthly transaction limits, cash deposit options, online and mobile tools, branch access, and whether the bank offers business credit products you can grow into. Check each bank's current fee schedule; fees change and no lesson here lists amounts.",
        "Three common starting options: a national bank with branches, which suits a business that wants in-person help in many places; a local credit union or community bank, which suits a business that wants lower fees and a local relationship; and an online business bank, which suits a business that works mostly online and wants low fees and strong mobile tools.",
        "Open the account in your legal business name with your EIN, after your EIN and DUNS number are in place. This is general information only, not financial advice.",
        DISCLAIMER,
      ],
      links: [
        { label: "SBA: launch your business", href: "https://www.sba.gov/business-guide/launch-your-business" },
      ],
      action: { label: "Open Business Foundations", href: "/app/guide#foundations" },
    };
  }

  // Net 30 accounts
  if (has("net 30", "net-30", "net30")) {
    return {
      title: "Net 30 accounts",
      body: [
        "A net-30 account lets you buy now and pay the invoice in full within 30 days. It builds business credit only when the vendor reports your payments to Dun and Bradstreet, Experian Business, or Equifax Business, so confirm reporting before you open the account.",
        "Vendors that commonly offer net-30 terms to new businesses include office supply vendors, janitorial and packaging suppliers, and fuel and auto parts vendors. Four starter vendors that business credit guides commonly cite are Uline for shipping and packaging supplies, Quill for office and cleaning supplies, Grainger for industrial and safety supplies, and Crown Office Supplies for office supplies. Terms and reporting change, so confirm with the vendor that it reports to Dun and Bradstreet, Experian Business, or Equifax Business before you order, and know that approval is never guaranteed. To apply, have your EIN, DUNS number, business bank account, and one consistent business name, address, and phone number ready.",
        "Start with 2 to 3 accounts, pay every invoice on time or early and never late, keep balances low, and pay in full. Net 30 is step 4 of the credit path: EIN, then DUNS number, then business bank account, then net-30 accounts, then larger vendor and fleet accounts, then bank lines.",
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

  // Business credit / DUNS
  if (
    has(
      "business credit",
      "build credit",
      "start business credit",
      "how to start credit",
      "line of credit",
      "bank loan",
      "sba loan",
      "duns",
      "trade line",
      "credit tier"
    )
  ) {
    return {
      title: "Building business credit",
      body: [
        "Business credit builds in steps, in this order. Step 1: get your EIN from the IRS. Step 2: get a free DUNS number from Dun and Bradstreet. Step 3: open a business bank account in your legal business name. Step 4: open 2 to 3 net-30 accounts with vendors that report payments, and pay every invoice on time or early. Step 5: larger vendor accounts with higher limits, then fleet cards and equipment financing. Step 6: bank lines of credit and SBA loans.",
        "Each step rests on the one before it. Vendors and lenders check that your business name, address, and phone are consistent everywhere, and that your earlier accounts were paid on time.",
        "The tier ladder (Tier 0 through Tier 4) is an educator planning framework, not an official rating system, and approval for any account is never guaranteed. Scam warnings: never pay for an EIN, UEI, DUNS number, or SAM renewal, and never use a CPN (credit privacy number).",
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

  // How to obtain capital
  if (
    has(
      "capital",
      "fund my",
      "funding",
      "obtain funding",
      "get funding",
      "raise capital",
      "startup funding",
      "microloan",
      "micro loan",
      "cdfi",
      "7(a)",
      "7a loan",
      "grant",
      "grants"
    )
  ) {
    return {
      title: "How to obtain capital",
      body: [
        "Start with the SBA: a 7(a) loan from an SBA-approved lender can cover working capital, equipment, and starting costs, with a program maximum of $5 million, and SBA microloans go up to $50,000 through nonprofit intermediary lenders for smaller needs. A business line of credit from your bank works the same way for short gaps: draw only what you need and pay it back as invoices land.",
        "Community Development Financial Institutions (CDFIs) are mission-driven lenders that often work with new and underserved businesses a bank may turn down. Your local Small Business Development Center can point you to lenders in your area. Business credit cards can bridge a small gap, but pay the balance fast because the rates are high.",
        "Grants for starting a business are rare, and real grants never charge an application fee. Anyone who promises guaranteed funding for a fee is selling you something, not funding you. Merchant cash advances are the most expensive option of all: fast cash against future sales at a very high cost, so treat them as a last resort.",
        DISCLAIMER,
      ],
      links: [
        { label: "SBA funding programs", href: "https://www.sba.gov/funding-programs" },
      ],
      action: { label: "Open Business Foundations", href: "/app/guide#foundations" },
    };
  }

  // Paying others while waiting on government payment
  if (
    has(
      "cash flow",
      "cashflow",
      "pay my subcontractors",
      "pay subcontractors",
      "pay my suppliers",
      "pay suppliers",
      "pay others",
      "pay subs",
      "pay my team",
      "while waiting",
      "waiting on payment",
      "waiting for payment",
      "before the government pays",
      "government pays me",
      "factoring",
      "invoice factoring",
      "assignment of claims",
      "pay my workers",
      "pay people",
      "cover payroll",
      "payroll",
      "float the"
    )
  ) {
    return {
      title: "Paying others while waiting on government payment",
      body: [
        "Plan this before you bid, not after you win. Under the Prompt Payment Act, a federal buyer generally pays a proper invoice within 30 days after it receives the invoice or accepts the work, whichever is later, and small businesses have a 15-day payment goal. State and local buyers set their own timelines, so read the award. That means weeks pass between doing the work and seeing the money.",
        "The tools for the gap: a business line of credit you open before you need it; invoice factoring, where a financing company advances you most of an accepted invoice and collects from the buyer; and assignment of claims, which lets a federal prime contractor assign the right to be paid under a contract to a bank or financing institution so the lender can collect directly from the government. Start the assignment paperwork early because it takes time to set up. Supplier net terms help too: buy on net-30 terms and pay the supplier after the buyer pays you.",
        "Never promise a subcontractor or supplier a payment date you cannot cover. Put payment timing in writing in every subcontract, read any pay-when-paid clause before you sign, and schedule sub payments against your milestones so money goes out only after work is accepted. If the cash is not lined up, do not take the award.",
        DISCLAIMER,
      ],
      links: [
        { label: "SBA funding programs", href: "https://www.sba.gov/funding-programs" },
      ],
      action: { label: "Open contracts", href: "/app/contracts" },
    };
  }

  // Bonds: bid, performance, and payment
  if (
    has(
      "bond",
      "bonds",
      "bid bond",
      "performance bond",
      "payment bond",
      "surety",
      "bonding"
    )
  ) {
    return {
      title: "Bonds: bid, performance, and payment",
      body: [
        "A bid bond guarantees that if you win the bid, you will sign the contract and furnish the bonds the award requires. On federal work the bid guarantee is generally at least 20 percent of the bid price, capped at $3 million. A performance bond guarantees you will finish the work as the contract requires. A payment bond guarantees your subcontractors, laborers, and suppliers get paid.",
        "Under the Miller Act, federal construction contracts over $150,000 require both a performance bond and a payment bond, each generally equal to 100 percent of the contract price. Contracts between $35,000 and $150,000 require other payment protections the contracting officer selects. Most states have their own version of the Miller Act for state-funded construction, with different thresholds, so check the solicitation.",
        "Bonds are not insurance: a surety underwrites them on your financials, credit, and experience, and you pay a premium for the bond. Talk to a surety agent early, before you bid, because bonding capacity takes time to build and a bid you cannot bond is a bid you cannot win.",
        DISCLAIMER,
      ],
      action: { label: "Open contracts", href: "/app/contracts" },
    };
  }

  // Insurance
  if (
    has(
      "insurance",
      "general liability",
      "workers comp",
      "workers compensation",
      "workmans comp",
      "commercial auto",
      "professional liability",
      "certificate of insurance",
      "liability insurance",
      "do i need insurance"
    )
  ) {
    return {
      title: "What insurance do I need?",
      body: [
        "Most solicitations name the insurance they require, and the amounts vary by contract, so the solicitation controls. The coverages buyers ask for most often are general liability, which covers third-party injury and property damage; workers compensation, which covers your employees if they are hurt on the job; commercial auto, which covers vehicles used for the work; and professional liability, which covers errors in professional services.",
        "Start with a general liability policy and add the rest as solicitations require. Keep your certificates of insurance current, because the Workbench compliance matrix asks for the certificate on every bid and an expired certificate can sink a proposal.",
        "Insurance is not a bond: insurance protects you against losses, while a bond guarantees the buyer you will perform. Talk to a commercial insurance agent who works with government contractors; they know what solicitations usually ask for.",
        DISCLAIMER,
      ],
      action: { label: "Open contracts", href: "/app/contracts" },
    };
  }

  // How long until the first win
  if (
    has(
      "how long until",
      "how long does it take",
      "how long before",
      "how soon",
      "when will i win",
      "first win",
      "how long to win",
      "how many bids"
    )
  ) {
    return {
      title: "How long until I win my first contract?",
      body: [
        "There is no guaranteed timeline, and anyone who promises you a win by a date is selling something. Months of steady bidding before a first win is normal: you are learning the process, building registrations and certifications, and getting your pricing right while buyers get to know you.",
        "Micro-purchases and small local buys are the fastest path to a first win because they are simpler and have less competition. Larger federal work takes longer and usually comes after you have past performance to show.",
        "The pattern that works is volume with discipline: bid only on work you can actually deliver, track every bid in Contract Hub, and keep bidding while you build. Each bid teaches you something, even the ones you lose.",
        DISCLAIMER,
      ],
      action: { label: "Open opportunities", href: "/app/opportunities" },
    };
  }

  // Winning with no past performance
  if (
    has(
      "past performance",
      "no past performance",
      "no experience",
      "no track record",
      "just started",
      "never won",
      "first contract",
      "win my first",
      "build past performance",
      "no history"
    )
  ) {
    return {
      title: "Winning with no past performance",
      body: [
        "Yes, you can win without past performance, but you have to build it first. The most common path is to subcontract: do work for a prime contractor, deliver well, and ask the prime to confirm the work in writing so it becomes past performance you can cite.",
        "Teaming with an experienced business on a bid also works: the team brings the past performance while you bring the product or the labor. Smaller buys help too: micro-purchases and small state and local contracts have less competition and simpler requirements, and each completed job adds a line to your capability statement.",
        "Document everything from day one: the contract, delivery proof, invoices, and a short note from the buyer or prime about the quality of the work. Past performance is what buyers weigh most, and clean records are how a new business earns it.",
        DISCLAIMER,
      ],
      action: { label: "Open your capability statement", href: "/app/capability" },
    };
  }

  // Prime contractor vs subcontractor
  if (
    has(
      "prime contractor",
      "prime vs",
      "what is a prime",
      "be a subcontractor",
      "become a subcontractor",
      "work as a subcontractor",
      "subcontractor",
      "subcontracting",
      "prime and sub",
      "prime or sub"
    )
  ) {
    return {
      title: "Prime contractor vs subcontractor",
      body: [
        "The prime contractor holds the contract with the government buyer and is responsible to the buyer for all of the work, including the work a subcontractor performs. The subcontractor works for the prime, not for the buyer, under a subcontract the prime issues.",
        "Starting as a subcontractor is the usual way in: you learn the process, build past performance, and earn income without carrying the full prime risk. As a prime, you control the bid and the margin, but you also carry the compliance, bonding, and delivery risk.",
        "On set-aside contracts the prime generally must self-perform about 50 percent of the work (FAR 52.219-14), so a prime cannot subcontract away the whole job. The Workbench guardrails card checks your self-performed percentage on every bid.",
        DISCLAIMER,
      ],
      action: { label: "Open contracts", href: "/app/contracts" },
    };
  }

  // Spotting scams
  if (
    has(
      "scam",
      "scams",
      "fraud",
      "guaranteed contract",
      "guaranteed contracts",
      "pay to bid",
      "paid bid list",
      "bid list",
      "is this legit",
      "is it a scam",
      "legit",
      "legitimate",
      "too good to be true",
      "upfront fee"
    )
  ) {
    return {
      title: "How to spot a government contract scam",
      body: [
        "The government never charges you to bid. SAM.gov registration, your UEI, your EIN, and your DUNS number are all free, and any site or caller charging for them is a middleman at best and a scam at worst.",
        "Watch for these signs: a promise of a guaranteed contract, a paid list of secret bids, a fee to see an opportunity, pressure to pay fast, or payment asked by gift card or wire transfer. Real solicitations are published on SAM.gov or the buyer's official portal, and real buyers never ask you to pay to win.",
        "Verify everything on the official site: find the solicitation on SAM.gov or the buyer portal yourself, and confirm any buyer contact through the agency's official directory before you send documents or money. If it feels rushed or secret, walk away.",
        DISCLAIMER,
      ],
      links: [
        { label: "Search open solicitations on SAM.gov", href: "https://sam.gov" },
      ],
      action: { label: "Open opportunities", href: "/app/opportunities" },
    };
  }

  // Solicitation types: RFQ vs RFP vs IFB
  if (
    has(
      "what is an rfq",
      "what is a rfq",
      "what does rfq",
      "rfq vs",
      "rfq and",
      "rfq or",
      "request for quote",
      "request for quotation",
      "what is an ifb",
      "what is a ifb",
      "what does ifb",
      "invitation for bid",
      "invitation to bid",
      "sealed bid",
      "what is an rfi",
      "what is a rfi",
      "sources sought",
      "solicitation type",
      "types of solicitation",
      "difference between an rfq",
      "difference between rfq",
      "rfp vs",
      "what is an rfp",
      "what does rfp",
      "rfp and an rfq",
      "rfp or rfq"
    )
  ) {
    return {
      title: "RFQ vs RFP vs IFB",
      body: [
        "An RFQ, a request for quotation, is how buyers usually buy simpler goods: you quote a price for a defined item, and the award often goes to the lowest priced quote that meets the requirements.",
        "An RFP, a request for proposal, is for more complex work: you submit a full proposal showing how you will do the work, and the buyer awards on best value, weighing technical merit and price together. An IFB, an invitation for bids, is a sealed bid: you bid a price, the bids are opened publicly, and the award usually goes to the lowest responsive bidder.",
        "An RFI or sources sought notice is market research, not a bid: the buyer is asking who can do the work, and no award follows it. Respond to those when you can, because they shape the real solicitation that comes later.",
        DISCLAIMER,
      ],
      action: { label: "Open contracts", href: "/app/contracts" },
    };
  }

  // Business license
  if (
    has(
      "business license",
      "license",
      "licensed",
      "permit",
      "permits",
      "do i need a license"
    )
  ) {
    return {
      title: "Do I need a business license?",
      body: [
        "It depends on your city, state, and industry. Most cities require a general business license or registration to operate, and some trades, like electrical, plumbing, or construction work, need a professional license on top of that. Check Detroit and Michigan licensing rules for your line of work before you bid.",
        "SAM.gov registration is not a business license: it makes you visible to federal buyers, but it does not authorize you to operate a business. Some solicitations also require a specific license for the work, and the solicitation will say so.",
        "If the solicitation requires a license you do not have, do not bid until you have it or have teamed with someone who does. A bid without a required license is a bid that cannot be awarded.",
        DISCLAIMER,
      ],
      action: { label: "Open registrations", href: "/app/registrations" },
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
  if (has("certification", "certifications", "wosb", "hubzone", "dbe", " mbe", "mbe certification", "8(a)")) {
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

  // Contract basics
  if (
    has(
      "contract basics",
      "what is a contract",
      "how do contracts work",
      "contract stages",
      "bid stages",
      "what is a bid",
      "how do i bid"
    )
  ) {
    return {
      title: "Contract basics",
      body: [
        "A government contract is a formal agreement to supply goods or services to a government buyer. You find open opportunities, check that you meet the requirements, submit a bid or proposal by the deadline, and the buyer awards the work to the best value offer.",
        "In Contract Hub, every opportunity you track moves through 8 stages: watching, preparing, submitted, shortlisted, awarded, in progress, completed, and closed out. Move a contract forward as it progresses, and the dashboard keeps deadlines and renewals in view.",
        "Before you bid, read the solicitation carefully: the deadline, the delivery location, the required certifications, and any insurance or bonding. The Workbench compliance checklist helps you catch those requirements before you submit.",
        DISCLAIMER,
      ],
      action: { label: "Open contracts", href: "/app/contracts" },
    };
  }

  // Finding suppliers
  if (
    has(
      "find suppliers",
      "find a supplier",
      "find vendors",
      "supplier",
      "vendor",
      "vendors",
      "where to buy",
      "source products",
      "buy supplies"
    )
  ) {
    return {
      title: "Finding suppliers",
      body: [
        "Start with vendors you already buy from and ask whether they offer net-30 terms or a business account. For a new product line, search the supplier's own site or a wholesale directory, then check that they ship to your area and can meet the delivery date in the solicitation.",
        "Track every vendor you contact in the Suppliers section, with notes on what they sell and how the outreach went. When a bid needs a price, collect quotes there and compare landed cost (product cost plus shipping, fees, and fulfillment) before you set your bid price.",
        "Never pay a supplier directory or a middleman just to see a vendor list. Real suppliers will talk terms with a registered business that has an EIN and a DUNS number.",
        DISCLAIMER,
      ],
      action: { label: "Open suppliers", href: "/app/suppliers" },
    };
  }

  // Finding contracts to bid on
  if (
    has(
      "find contracts",
      "find bids",
      "find opportunities",
      "open bids",
      "open opportunities",
      "where to find contracts",
      "search for bids",
      "search for contracts",
      "look for contracts"
    )
  ) {
    return {
      title: "Finding contracts to bid on",
      body: [
        "Save a search with the keywords and location that match what you sell, and Contract Hub scans for you every day. Matches land in Opportunities and in your Alerts inbox. You can also run a one-time scan right now from the Opportunities page.",
        "Scans cover SAM.gov for federal work, Detroit Bonfire for City of Detroit work, and MITN (BidNet) for Michigan local work. Michigan SIGMA needs a manual check, and the Opportunities page links to it. Every match is scored against your profile keywords and NAICS codes, and matches scoring 40 or higher are saved for you.",
        "Start narrow: one or two keywords tied to a real product or service you can deliver. Track a bid you like and it enters the 8-stage lifecycle, from watching through closeout.",
        DISCLAIMER,
      ],
      action: { label: "Open opportunities", href: "/app/opportunities" },
    };
  }

  // Writing a proposal
  if (
    has(
      "proposal",
      "write a proposal",
      "submit a proposal",
      "submit a bid",
      "submit my bid",
      "respond to a solicitation",
      "solicitation",
      "rfp",
      "rfq",
      "ifb",
      "request for proposal"
    )
  ) {
    return {
      title: "Writing a proposal",
      body: [
        "Track the opportunity first, then open its Proposal Workbench. The solicitation analyzer pulls out the deadline, delivery requirements, and questions deadline from the solicitation text. Every extraction is labeled a draft suggestion, so verify it against the official solicitation before you rely on it.",
        "Work through the compliance matrix, which seeds 8 starter items including the certificate of insurance, then build your proposal in the 6-section builder and save a version snapshot when it is ready. Collect supplier quotes with landed cost and check the margin calculator before you set your price.",
        "Finish with the submission checklist, then submit through the buyer's own portal by the deadline. Contract Hub prepares the packet; it does not submit the bid for you.",
        DISCLAIMER,
      ],
      action: { label: "Open contracts", href: "/app/contracts" },
    };
  }

  // Capability statement
  if (has("capability statement", "capability")) {
    return {
      title: "What is a capability statement?",
      body: [
        "A capability statement is a one-page summary buyers use to judge whether you can do the work: what you sell, your NAICS codes, your certifications, your past performance, and how to reach you. Buyers often ask for it before they invite you to bid.",
        "Contract Hub builds one for you from your business profile. Fill in your profile, NAICS codes, certifications summary, and past performance, then open the Capability page to preview it and print it or save it as a PDF.",
        "If you would rather have one made for you, Lexis Sapphire Studio makes capability statements for $55. The button below takes you to pay for it.",
        "Keep it to one page and update it after every award, because past performance is what buyers weigh most.",
        DISCLAIMER,
      ],
      links: [
        { label: "Or build one yourself free in the app", href: "/app/capability" },
      ],
      action: {
        label: "Get your capability statement made, $55",
        href: "https://buy.stripe.com/7sYdR87km9B52NugjpfrW0m",
      },
    };
  }

  // Getting paid
  if (
    has(
      "get paid",
      "paid for",
      "invoice",
      "invoicing",
      "send an invoice",
      "milestone",
      "when do i get paid",
      "receive payment"
    )
  ) {
    return {
      title: "Getting paid for a contract",
      body: [
        "On the contract detail page, add a milestone for each delivery step and mark it complete as you deliver. Add invoices there too; they are numbered automatically (INV-####) and move through draft, sent, paid, and overdue, with paid and outstanding totals shown.",
        "Government buyers pay on the terms in the award, not on yours, so read the award documents for the payment schedule and how to invoice. Many federal buyers pay through the Invoice Processing Platform (IPP); your award will say where to send the invoice.",
        "If an invoice goes overdue, follow up with the buyer's point of contact and keep a record of every message. Do not start new work for a buyer who has not paid for the last job without a written plan to catch up.",
        DISCLAIMER,
      ],
      action: { label: "Open contracts", href: "/app/contracts" },
    };
  }

  // NAICS codes
  if (
    has("naics", "industry code", "classification code", "what code do i need")
  ) {
    return {
      title: "What NAICS codes do I need?",
      body: [
        "NAICS codes are the 2 to 6 digit numbers that describe what a business sells, and buyers use them to find vendors and set eligibility for set-aside work. Pick the codes for what you actually sell, not what you might sell one day.",
        "Add them to your business profile, separated by commas, for example 561720 for janitorial services or 423850 for janitorial supply wholesaling. Scans score opportunities against your codes, so the right codes mean better matches.",
        "Look codes up at naics.com or in the U.S. Census NAICS search. If you sell more than one thing, list a code for each line.",
        DISCLAIMER,
      ],
      action: { label: "Open your profile", href: "/app/profile" },
    };
  }

  // Cost to start
  if (
    has(
      "how much does it cost",
      "cost to start",
      "cost to get started",
      "startup cost",
      "start-up cost",
      "how much money do i need"
    )
  ) {
    return {
      title: "How much does it cost to start?",
      body: [
        "The core registrations are free: an EIN from the IRS, a UEI and SAM.gov registration, and a DUNS number all cost nothing when you do them yourself at the official sites. Never pay a service for any of them.",
        "Contract Hub is free for now, with a paid Pro tier coming later. State filing fees to form your business vary by state, and business bank account fees vary by bank, so check the current schedule before you file or open an account.",
        "You do not need inventory to start as a broker: you quote the buyer's need, buy from your supplier only after you win, and get paid on the award terms. Your biggest early cost is time.",
        DISCLAIMER,
      ],
      action: { label: "See the plan", href: "/app/plan" },
    };
  }

  // Nonmanufacturer rule and subcontracting limits
  if (
    has(
      "nonmanufacturer",
      "non-manufacturer",
      "non manufacturer",
      "50% rule",
      "50 percent",
      "subcontracting limit",
      "subcontract",
      "self-perform",
      "self perform"
    )
  ) {
    return {
      title: "The nonmanufacturer rule and subcontracting limits",
      body: [
        "If you supply products you do not make yourself, the nonmanufacturer rule applies to set-aside supply contracts: you generally must supply a product made by a small business manufacturer, unless the SBA has issued a waiver for that product class. The Workbench has a nonmanufacturer rule checklist to check against each solicitation.",
        "Set-aside contracts also generally require the prime contractor to self-perform about 50 percent of the work (FAR 52.219-14). The Workbench guardrails card checks the self-performed percentage you enter and flags it when it falls below 50 percent.",
        "Both rules are general information, not legal advice, and the exact clause in your solicitation controls. Verify each point against the solicitation before you submit.",
        DISCLAIMER,
      ],
      action: { label: "Open contracts", href: "/app/contracts" },
    };
  }

  // After winning a bid
  if (
    has(
      "after i win",
      "after winning",
      "won a bid",
      "win a bid",
      "after award",
      "after the award",
      "i won",
      "what happens after"
    )
  ) {
    return {
      title: "What happens after I win a bid?",
      body: [
        "Move the contract to awarded, then to in progress when work starts. Read the award documents first: they set the start date, the delivery schedule, and how to invoice.",
        "Track delivery with milestones and payment with invoices on the contract detail page. When the work is done, mark it completed and close it out; completed contracts become the past performance on your capability statement.",
        "Keep every record from the award: the solicitation, your proposal, the award, delivery proof, and invoices. Buyers check past performance on the next bid, and clean records are what win it.",
        DISCLAIMER,
      ],
      action: { label: "Open contracts", href: "/app/contracts" },
    };
  }

  // Inviting a team
  if (has("team member", "my team", "invite", "add a team", "team")) {
    return {
      title: "How do I invite my team?",
      body: [
        "Open the Team page and add each person by name, email, and role: Owner, Admin, Member, or Viewer. Owners have full control. Admins can manage nearly everything except the team itself. Members can edit work but not billing. Viewers can only read.",
        "In this version, adding a member records them on your team; no email invitation is sent yet, so tell the person directly that they are added. Email invitations arrive in a later phase.",
        "You can change a member's role or remove them at any time. The owner cannot be removed.",
        DISCLAIMER,
      ],
      action: { label: "Open team", href: "/app/team" },
    };
  }

  // Do I need a website?
  if (
    has(
      "website",
      "web site",
      "do i need a website",
      "business website",
      "build a website",
      "need a site"
    )
  ) {
    return {
      title: "Do I need a website?",
      body: [
        "No, not to start bidding. Government buyers check your SAM registration and your capability statement first, and neither one needs a website.",
        "Contract Hub does not have a website builder. When you are ready, a simple one-page site is enough: who you are, what you sell, your NAICS codes, and how to reach you. Free hosting options exist, and your capability statement can stand in for a site until then.",
        "Do not spend money on a fancy website before your first bid. Win work first, then invest in the site. When you are ready, Lexis Sapphire Studio builds websites for small businesses through Contract Hub, starting at $575. A basic site is $575, and it costs more if you need something beyond a basic site. The button below takes you to pay for your website.",
        DISCLAIMER,
      ],
      action: {
        label: "Get your website built, from $575",
        href: "https://buy.stripe.com/8x214mfQSeVpgEk9V1frW0l",
      },
    };
  }

  // Signing in
  if (
    has(
      "sign in",
      "signing in",
      "log in",
      "login",
      "log me in",
      "magic link",
      "forgot password",
      "reset my password"
    )
  ) {
    return {
      title: "Signing in to Contract Hub",
      body: [
        "Sign in at the login page with the email and password you used to sign up. If you prefer no password, choose the email link option and Contract Hub sends you a magic link to sign in with one tap.",
        "If you forgot your password, use the reset option on the login page and follow the link sent to your email. Never share your password with anyone, and Contract Hub will never ask for it in chat or by email.",
        "To sign out, use the Sign out button at the top of your dashboard. Your data stays locked to your account.",
        DISCLAIMER,
      ],
      links: [{ label: "Go to the login page", href: "/login" }],
      action: { label: "Open the login page", href: "/login" },
    };
  }

  // Fallback
  return {
    title: "What the Guide covers",
    body: [
      "I can help with your weekly priorities, SAM.gov registration and renewal, getting an EIN or UEI, building business credit, choosing a business bank account, net-30 accounts and suppliers, certifications that fit your business, pricing and margins, finding contracts to bid on, writing a proposal, your capability statement, getting paid, NAICS codes, starting costs, the nonmanufacturer rule and subcontracting limits, what happens after you win, inviting your team, whether you need a website, obtaining capital, paying others while you wait on government payment, bonds and insurance, winning with no past performance, prime versus subcontractor, how long a first win takes, spotting scams, solicitation types, and business licenses, advertising in the Hub, and updating contracts with Talk to update.",
      "Try one of the suggested questions below, or ask in your own words and I will point you to the right section.",
    ],
  };
}
