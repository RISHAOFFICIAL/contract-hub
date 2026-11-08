import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function signOutAndRedirect(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`);
}

export async function POST(request: Request) {
  return signOutAndRedirect(request);
}

// The dashboard signs out with a POST form, but a plain link or navigation
// reaches this route with GET. Handle both so sign-out never shows a 405.
export async function GET(request: Request) {
  return signOutAndRedirect(request);
}
