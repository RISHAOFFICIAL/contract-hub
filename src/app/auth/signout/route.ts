import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function signOutAndRedirect(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { origin } = new URL(request.url);
  // 303, not the default 307: a 307 would make the browser repeat the
  // request with the same method, so a POST sign-out would re-POST to
  // /login, a GET-only page route, and Next.js would answer 405.
  // A 303 makes the browser follow with GET instead.
  return NextResponse.redirect(`${origin}/login`, 303);
}

export async function POST(request: Request) {
  return signOutAndRedirect(request);
}

// The dashboard signs out with a POST form, but a plain link or navigation
// reaches this route with GET. Handle both so sign-out never shows a 405.
export async function GET(request: Request) {
  return signOutAndRedirect(request);
}
