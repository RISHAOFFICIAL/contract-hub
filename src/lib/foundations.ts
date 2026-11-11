import { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

/* ============================================================
   Business Foundations: 11 guided lessons, official sources only
   ============================================================ */

export interface LessonLink {
  label: string;
  href: string;
}

export interface Lesson {
  key: string;
  title: string;
  summary: string;
  steps: string[];
  links: LessonLink[];
  checkKey: string;
}

export const LESSONS: Lesson[] = [
  {
    key: "ein",
    title: "Get your EIN",
    summary:
      "An Employer Identification Number is the tax ID the IRS issues to your business. You need it for SAM registration, business bank accounts, and most certifications. Applying online is free and usually instant.",
    steps: [
      "Decide your legal entity type (sole proprietor, LLC, corporation) before you apply.",
      "Open the IRS EIN Assistant at irs.gov and complete the interview-style application.",
      "Save the confirmation letter (CP 575) the IRS issues at the end.",
      "Store the EIN letter in your Contract Hub vault for easy reuse.",
      "Never pay a third-party service; the real application is always free at irs.gov.",
    ],
    links: [
      {
        label: "Apply for an EIN online at IRS.gov",
        href: "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online",
      },
    ],
    checkKey: "You have an EIN from the IRS and the CP 575 letter saved.",
  },
  {
    key: "uei_sam",
    title: "Get your UEI and register on SAM.gov",
    summary:
      "The UEI is the identifier SAM.gov assigns to your business, and a full SAM entity registration makes you eligible for federal awards. Both are free. A UEI alone is not a full registration.",
    steps: [
      "Create a Login.gov account if you do not have one.",
      "Request your UEI at sam.gov (free, usually issued within a day or two).",
      "Start an entity registration: legal name, physical address, EIN, UEI, NAICS codes, banking details.",
      "Complete the reps and certs section and submit the registration.",
      "Mark your calendar: SAM renews every year, and it is free.",
    ],
    links: [
      {
        label: "SAM.gov entity registration",
        href: "https://sam.gov/content/entity-registration",
      },
    ],
    checkKey: "Your SAM.gov entity registration is active.",
  },
  {
    key: "tier0",
    title: "Tier 0: business basics",
    summary:
      "Tier 0 is the credibility foundation lenders and vendors check first. A clean, consistent business footprint here makes every later credit tier easier.",
    steps: [
      "Form your legal entity and keep formation documents filed where you can find them.",
      "Use one consistent legal name, address, and business phone number everywhere.",
      "Get your EIN from the IRS (see the EIN lesson).",
      "Open a dedicated business bank account in the legal business name.",
      "Set up a professional business email and a simple online presence.",
    ],
    links: [
      { label: "SBA: launch your business", href: "https://www.sba.gov/business-guide/launch-your-business" },
    ],
    checkKey: "Entity formed, EIN in hand, business bank account open.",
  },
  {
    key: "best_banks",
    title: "Best banks for a business bank account",
    summary:
      "The best bank for your business is the one whose fees, limits, and tools fit how you actually operate. Compare a few options before you open the account, because switching later costs time.",
    steps: [
      "Compare monthly fees first, and how to waive them, such as a minimum balance or direct deposits. Check the bank's current fee schedule; fees change and this lesson does not list amounts.",
      "Check the minimum opening deposit and any minimum balance you must keep.",
      "Check transaction limits: how many free deposits, withdrawals, and transfers you get each month, and what extra ones cost.",
      "Check cash deposits: whether the bank takes cash, where, and what it costs, if your business handles cash.",
      "Check online and mobile tools: bill pay, mobile deposit, invoicing, and connections to your bookkeeping.",
      "Check branch access: whether you need a branch nearby, or whether online-only works for you.",
      "Ask whether the bank offers business credit products you can grow into, such as a business credit card or a line of credit.",
      "A national bank with branches suits a business that wants in-person help in many places.",
      "A local credit union or community bank suits a business that wants lower fees and a local relationship.",
      "An online business bank suits a business that works mostly online and wants low fees and strong mobile tools.",
      "Pick the account that fits your actual volume, then open it in your legal business name with your EIN. This is general information only, not financial advice.",
    ],
    links: [
      { label: "SBA: launch your business", href: "https://www.sba.gov/business-guide/launch-your-business" },
    ],
    checkKey: "You compared at least two banks and opened a business account that fits your volume.",
  },
  {
    key: "tier1",
    title: "Tier 1: starter trade lines",
    summary:
      "Tier 1 builds your first payment history with vendors who extend net-30 terms and report to business credit bureaus. Pay every invoice on time or early.",
    steps: [
      "List suppliers you already buy from and ask whether they offer net-30 terms.",
      "Open 3 to 5 starter trade lines with vendors that report payments.",
      "Keep utilization low and pay every invoice on time or early.",
      "Confirm each vendor actually reports; unreported accounts do not build your file.",
      "Track open trade lines and due dates in Contract Hub.",
      "New to net-30 terms? Read the Net 30 accounts lesson first; it explains how vendor reporting builds your file.",
    ],
    links: [
      { label: "SBA funding programs", href: "https://www.sba.gov/funding-programs" },
    ],
    checkKey: "At least 3 reporting trade lines with on-time payments.",
  },
  {
    key: "net30",
    title: "Net 30 accounts",
    summary:
      "A net-30 account lets you buy now and pay the invoice in full within 30 days. When the vendor reports your payments to a business credit bureau, on-time payments build your business credit file.",
    steps: [
      "Net 30 means the vendor ships your order now and you pay the full invoice within 30 days of the invoice date. It is short-term trade credit, not a loan.",
      "It builds business credit only when the vendor reports payments to Dun and Bradstreet, Experian Business, or Equifax Business. Always confirm reporting before you open the account; unreported accounts do not build your file.",
      "Vendors that commonly offer net-30 terms to new businesses include office supply vendors, janitorial and packaging suppliers, and fuel and auto parts vendors.",
      "To apply, have your EIN, DUNS number, business bank account, and one consistent business name, address, and phone number ready. The vendor checks that your business looks real and consistent.",
      "Start with 2 to 3 accounts, not ten. A few clean accounts beat a long list of unused ones.",
      "Pay every invoice on time or early, and never late. One late payment can undo months of good history.",
      "Keep balances low and pay in full; do not carry a balance past the due date.",
      "Track each invoice due date in Contract Hub so nothing slips.",
      "Net 30 is step 4 of the credit path: EIN, then DUNS number, then business bank account, then net-30 accounts, then larger vendor and fleet accounts, then bank lines.",
    ],
    links: [
      {
        label: "Get a free DUNS number",
        href: "https://www.dnb.com/duns-number/get-a-duns.html",
      },
      { label: "SBA funding programs", href: "https://www.sba.gov/funding-programs" },
    ],
    checkKey: "At least 2 reporting net-30 accounts with on-time payments.",
  },
  {
    key: "tier2",
    title: "Tier 2: bigger vendor accounts",
    summary:
      "Tier 2 moves you from starter lines to larger vendor accounts with higher limits. Six to twelve months of clean Tier 1 history is the usual springboard.",
    steps: [
      "Review your Tier 1 payment history; fix any late payments first.",
      "Request credit limit increases on your best-performing Tier 1 accounts.",
      "Open accounts with larger vendors in your industry that report to bureaus.",
      "Keep balances under 30 percent of each limit.",
      "Add new accounts slowly, one or two at a time.",
    ],
    links: [
      { label: "SBA funding programs", href: "https://www.sba.gov/funding-programs" },
    ],
    checkKey: "Higher-limit vendor accounts open with balances under 30 percent.",
  },
  {
    key: "tier3",
    title: "Tier 3: fleet and equipment",
    summary:
      "Tier 3 adds fleet cards and equipment financing, which are larger obligations that strengthen your file when handled well. Only take on what the business cash flow supports.",
    steps: [
      "Confirm your business credit file shows a year or more of clean history.",
      "Apply for a fleet card if your business uses vehicles.",
      "Finance equipment through vendors that report payments to bureaus.",
      "Match every payment to your cash flow forecast; never stretch.",
      "Keep personal guarantees to a minimum where possible.",
    ],
    links: [
      { label: "SBA funding programs", href: "https://www.sba.gov/funding-programs" },
    ],
    checkKey: "Fleet or equipment account reporting with on-time payments.",
  },
  {
    key: "tier4",
    title: "Tier 4: bank and SBA credit",
    summary:
      "Tier 4 is bank lines of credit, term loans, and SBA-backed financing. Lenders look at your business credit file, revenue history, and personal credit together.",
    steps: [
      "Build 2 years of business financials (profit and loss, balance sheet).",
      "Keep your business credit file clean and your DUNS profile current.",
      "Talk to your business banker about a line of credit before you need it.",
      "Explore SBA loan programs (7(a), microloans) through an approved lender.",
      "Bring complete documents; incomplete packages are the top cause of delays.",
    ],
    links: [
      { label: "SBA loan programs", href: "https://www.sba.gov/funding-programs/loans" },
    ],
    checkKey: "A bank relationship and an SBA or bank credit application path.",
  },
  {
    key: "duns_bank",
    title: "DUNS and business bank account",
    summary:
      "Your DUNS number is Dun and Bradstreet's identifier for your business, and it is free. Pair it with a dedicated business bank account so your finances and credit footprint stay clean and separate.",
    steps: [
      "Request your free DUNS number at dnb.com (never pay for one).",
      "Verify your DUNS profile details match your legal name and address exactly.",
      "Open a business checking account in the legal business name.",
      "Compare banks before you open the account; see the Best banks for a business bank account lesson.",
      "Route all business income and expenses through that account only.",
      "Add the account details you need for SAM.gov payment setup.",
    ],
    links: [
      {
        label: "Get a free DUNS number",
        href: "https://www.dnb.com/duns-number/get-a-duns.html",
      },
    ],
    checkKey: "DUNS issued and a dedicated business bank account in use.",
  },
  {
    key: "certs_start",
    title: "Start your first certification",
    summary:
      "Certifications like WOSB, HUBZone, and DBE unlock set-aside contracts with less competition. Pick the one that matches your situation and gather your documents once.",
    steps: [
      "Confirm your SAM.gov registration is active (required for most programs).",
      "Match your situation to a program: woman-owned, HUBZone area, disadvantaged status, state work.",
      "Gather your document kit: formation papers, EIN letter, ownership proof, financials.",
      "Start the application at the program's official portal.",
      "Track the application in Contract Hub with its status and dates.",
    ],
    links: [
      {
        label: "SBA contracting certifications",
        href: "https://www.sba.gov/federal-contracting/contracting-guide",
      },
    ],
    checkKey: "Your first certification application started or approved.",
  },
];

export async function getLessonProgress(
  supabase: Db,
  businessId: string
): Promise<Record<string, boolean>> {
  const { data } = await supabase
    .from("foundation_progress")
    .select("lesson_key, completed")
    .eq("business_id", businessId);
  const map: Record<string, boolean> = {};
  for (const row of (data ?? []) as {
    lesson_key: string;
    completed: boolean;
  }[]) {
    map[row.lesson_key] = row.completed;
  }
  return map;
}

export async function toggleLesson(
  supabase: Db,
  businessId: string,
  key: string,
  completed: boolean
): Promise<void> {
  await supabase.from("foundation_progress").upsert(
    {
      business_id: businessId,
      lesson_key: key,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "business_id,lesson_key" }
  );
}
