import Link from "next/link";
import type { ReactNode } from "react";

/* ---------- Date and money helpers ---------- */

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function formatDate(
  dateStr: string | null | undefined
): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMoney(
  value: string | number | null | undefined
): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return null;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** Formats an ISO timestamp for a datetime-local input value. */
export function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/* ---------- Pills ---------- */

/** Red when overdue or within 3 days, amber within 14, muted otherwise. */
export function DeadlinePill({
  dateStr,
}: {
  dateStr: string | null | undefined;
}) {
  const days = daysUntil(dateStr);
  if (days === null)
    return <span className="pill pill-muted">No deadline</span>;
  if (days < 0)
    return (
      <span className="pill pill-bad">Overdue by {Math.abs(days)}d</span>
    );
  if (days === 0) return <span className="pill pill-bad">Due today</span>;
  if (days <= 3) return <span className="pill pill-bad">{days}d left</span>;
  if (days <= 14) return <span className="pill pill-warn">{days}d left</span>;
  return <span className="pill pill-muted">{days}d left</span>;
}

/** Red when past due, amber within warnDays, muted otherwise. */
export function ExpiryPill({
  dateStr,
  warnDays = 90,
}: {
  dateStr: string | null | undefined;
  warnDays?: number;
}) {
  const days = daysUntil(dateStr);
  if (days === null) return <span className="pill pill-muted">No expiry</span>;
  if (days < 0)
    return (
      <span className="pill pill-bad">Past due by {Math.abs(days)}d</span>
    );
  if (days === 0) return <span className="pill pill-bad">Expires today</span>;
  if (days <= warnDays)
    return <span className="pill pill-warn">{days}d left</span>;
  return <span className="pill pill-muted">{days}d left</span>;
}

/* ---------- Layout pieces ---------- */

export function PageHeader({
  eyebrow = "Contract Hub",
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 pt-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-dark">
          {eyebrow}
        </p>
        <h1 className="font-display text-3xl font-semibold text-forest">
          {title}
        </h1>
      </div>
      {action}
    </header>
  );
}

export function AddButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="btn-glass btn-primary-glass shrink-0 px-5 py-2.5 text-sm"
    >
      {label}
    </Link>
  );
}

export function EmptyState({
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="glass rounded-3xl p-8 text-center">
      <h2 className="font-display text-xl font-semibold text-forest">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">{body}</p>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="btn-glass btn-primary-glass mt-5 inline-block px-6 py-2.5 text-sm"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

/* ---------- Form pieces ---------- */

const inputClass =
  "w-full rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return <textarea {...props} rows={props.rows ?? 3} className={inputClass} />;
}

export function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={inputClass}>
      {children}
    </select>
  );
}

export function FormCard({
  children,
  backHref,
  backLabel = "Back",
}: {
  children: ReactNode;
  backHref: string;
  backLabel?: string;
}) {
  return (
    <div className="space-y-5">
      <Link
        href={backHref}
        className="inline-block text-sm font-semibold text-brass-dark"
      >
        {"<"} {backLabel}
      </Link>
      <div className="card-lux space-y-4 p-6">{children}</div>
    </div>
  );
}
