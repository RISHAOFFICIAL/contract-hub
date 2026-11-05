import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import {
  PageHeader,
  EmptyState,
  Field,
  TextInput,
  Select,
} from "@/components/ui";
import { SubmitButton, DeleteButton } from "@/components/ui-client";
import { addMember, changeRole, removeMember } from "./actions";

export type TeamMemberRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
};

function rolePill(role: string | null): string {
  switch (role) {
    case "owner":
      return "pill-active";
    case "admin":
      return "pill-warn";
    default:
      return "pill-muted";
  }
}

function roleLabel(role: string | null): string {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "";
}

export default async function TeamPage() {
  const supabase = await createClient();
  const businessId = await getBusinessId();
  if (!businessId) notFound();

  const { data } = await supabase
    .from("team_members")
    .select("id, name, email, role, status")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });
  const members = (data ?? []) as TeamMemberRow[];

  return (
    <div className="space-y-5">
      <PageHeader title="Team" />

      <section className="card-lux p-6">
        <h2 className="font-display text-lg font-semibold text-forest">
          Add a member
        </h2>
        <p className="mt-1 text-sm text-ink-faint">
          The member is recorded here. Email invitations arrive in a later
          phase.
        </p>
        <form action={addMember} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name">
              <TextInput name="name" required placeholder="Full name" />
            </Field>
            <Field label="Email">
              <TextInput
                name="email"
                type="email"
                placeholder="name@example.com"
              />
            </Field>
            <Field label="Role">
              <Select name="role" defaultValue="member">
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </Select>
            </Field>
          </div>
          <div className="max-w-xs">
            <SubmitButton label="Add member" pendingLabel="Adding..." />
          </div>
        </form>
      </section>

      <p className="text-sm text-ink-soft">
        Viewers can see everything but cannot edit.
      </p>

      {members.length === 0 ? (
        <EmptyState
          title="No team members yet"
          body="You are the owner. Add admins, members, or viewers to share this workspace."
        />
      ) : (
        <ul className="space-y-3">
          {members.map((m) => {
            const isOwner = m.role === "owner";
            return (
              <li key={m.id} className="card-lux space-y-3 p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{m.name}</p>
                    {m.email && (
                      <p className="text-sm text-ink-faint">{m.email}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <span className={`pill ${rolePill(m.role)}`}>
                      {roleLabel(m.role)}
                    </span>
                    <span
                      className={`pill ${
                        m.status === "active" ? "pill-active" : "pill-warn"
                      }`}
                    >
                      {m.status === "active" ? "Active" : "Invited"}
                    </span>
                  </div>
                </div>
                {!isOwner && (
                  <div className="flex flex-wrap items-end gap-3 border-t border-ink/10 pt-3">
                    <form
                      action={changeRole.bind(null, m.id)}
                      className="flex items-end gap-2"
                    >
                      <Field label="Role">
                        <Select name="role" defaultValue={m.role ?? "member"}>
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </Select>
                      </Field>
                      <button
                        type="submit"
                        className="btn-glass glass px-4 py-2.5 text-sm font-semibold text-forest"
                      >
                        Update
                      </button>
                    </form>
                    <DeleteButton
                      action={removeMember.bind(null, m.id)}
                      label="Remove"
                      confirmText={`Remove ${m.name ?? "this member"} from the team?`}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
