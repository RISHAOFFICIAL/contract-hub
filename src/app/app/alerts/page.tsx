import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { EmptyState, PageHeader, formatDate } from "@/components/ui";
import { markAlertRead, markAllAlertsRead } from "./actions";

const TYPE_LABELS: Record<string, string> = {
  opportunity: "Opportunity",
  deadline: "Deadline",
  amendment: "Amendment",
  renewal: "Renewal",
  system: "System",
};

const TYPE_PILL: Record<string, string> = {
  opportunity: "pill-active",
  deadline: "pill-bad",
  amendment: "pill-warn",
  renewal: "pill-warn",
  system: "pill-muted",
};

function relatedHref(
  table: string | null,
  id: string | null
): string | null {
  if (!table || !id) return null;
  switch (table) {
    case "opportunities":
      return "/app/opportunities";
    case "contracts":
      return `/app/contracts/${id}`;
    case "registrations":
      return "/app/registrations";
    default:
      return null;
  }
}

type AlertRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  related_id: string | null;
  related_table: string | null;
  is_read: boolean;
  created_at: string;
};

function AlertCard({ alert }: { alert: AlertRow }) {
  const href = relatedHref(alert.related_table, alert.related_id);
  return (
    <article
      className={`card-lux space-y-2 p-5 ${alert.is_read ? "opacity-75" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-forest">
            {alert.title}
          </h3>
          <p className="mt-0.5 text-xs text-ink-faint">
            {formatDate(alert.created_at)}{" "}
            {new Date(alert.created_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`pill ${TYPE_PILL[alert.type] ?? "pill-muted"}`}>
            {TYPE_LABELS[alert.type] ?? alert.type}
          </span>
          {!alert.is_read && (
            <span className="pill pill-bad">Unread</span>
          )}
        </div>
      </div>

      {alert.body && <p className="text-sm text-ink-soft">{alert.body}</p>}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {href && (
          <Link
            href={href}
            className="text-sm font-semibold text-brass-dark"
          >
            View record
          </Link>
        )}
        {!alert.is_read && (
          <form action={markAlertRead.bind(null, alert.id)}>
            <button
              type="submit"
              className="text-sm font-semibold text-ink-soft"
            >
              Mark read
            </button>
          </form>
        )}
      </div>
    </article>
  );
}

export default async function AlertsPage() {
  const businessId = await getBusinessId();
  const supabase = await createClient();

  const { data } = businessId
    ? await supabase
        .from("alerts")
        .select("*")
        .eq("business_id", businessId)
        .order("is_read", { ascending: true })
        .order("created_at", { ascending: false })
    : { data: [] };
  const alerts = (data ?? []) as AlertRow[];
  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alerts"
        action={
          unreadCount > 0 ? (
            <form action={markAllAlertsRead}>
              <button
                type="submit"
                className="btn-glass glass shrink-0 px-5 py-2.5 text-sm font-semibold text-forest"
              >
                Mark all read ({unreadCount})
              </button>
            </form>
          ) : undefined
        }
      />

      {alerts.length === 0 ? (
        <EmptyState
          title="No alerts yet"
          body="New matches, upcoming deadlines, and renewal reminders will land here."
        />
      ) : (
        <div className="space-y-4">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      )}
    </div>
  );
}
