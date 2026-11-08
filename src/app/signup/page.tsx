"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.push("/app");
      router.refresh();
    } else {
      setInfo(
        "Account created. Check your email to confirm, then sign in."
      );
    }
  }

  return (
    <main className="min-h-screen bg-ivory px-6 py-12">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="font-display text-2xl font-semibold text-forest"
        >
          Contract Hub
        </Link>
        <div className="card-lux mt-8 p-8">
          <h1 className="font-display text-3xl font-semibold text-forest">
            Create your account
          </h1>
          <p className="mt-2 text-ink-soft">
            Free to start. A blank business profile is created for you
            automatically.
          </p>

          <div className="mt-6">
            <GoogleSignInButton />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-ink/10" />
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              or sign up with email
            </span>
            <span className="h-px flex-1 bg-ink/10" />
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-[#f6e3df] px-4 py-3 text-sm font-medium text-[#8c3b2e]">
              {error}
            </p>
          )}
          {info && (
            <p className="mt-4 rounded-xl bg-forest-tint px-4 py-3 text-sm font-medium text-forest">
              {info}
            </p>
          )}

          <form onSubmit={handleSignup} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-ink">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none focus:border-brass"
                placeholder="you@business.com"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">
                Password (8 or more characters)
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none focus:border-brass"
                placeholder="Choose a password"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="btn-glass btn-primary-glass w-full px-6 py-3 disabled:opacity-60"
            >
              {busy ? "Creating..." : "Create free account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-forest underline underline-offset-2"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
