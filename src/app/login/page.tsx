"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-ivory px-6 py-12">
          <p className="text-center text-ink-soft">Loading...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(redirect);
    router.refresh();
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setInfo("Check your email for the sign in link.");
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
            Welcome back
          </h1>
          <p className="mt-2 text-ink-soft">
            Sign in to your Contract Hub account.
          </p>

          <div className="mt-6 flex rounded-full bg-ivory-deep p-1">
            <button
              type="button"
              onClick={() => setMode("password")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold ${
                mode === "password"
                  ? "bg-forest text-ivory"
                  : "text-ink-soft"
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => setMode("magic")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold ${
                mode === "magic" ? "bg-forest text-ivory" : "text-ink-soft"
              }`}
            >
              Email link
            </button>
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

          {mode === "password" ? (
            <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
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
                <span className="text-sm font-semibold text-ink">Password</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none focus:border-brass"
                  placeholder="Your password"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="btn-glass btn-primary-glass w-full px-6 py-3 disabled:opacity-60"
              >
                {busy ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="mt-6 space-y-4">
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
              <button
                type="submit"
                disabled={busy}
                className="btn-glass btn-primary-glass w-full px-6 py-3 disabled:opacity-60"
              >
                {busy ? "Sending..." : "Email me a sign in link"}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-ink-soft">
            New to Contract Hub?{" "}
            <Link
              href="/signup"
              className="font-semibold text-forest underline underline-offset-2"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
