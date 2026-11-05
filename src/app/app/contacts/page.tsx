import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { AddButton, EmptyState, PageHeader } from "@/components/ui";
import { DeleteButton } from "@/components/ui-client";
import { deleteContact, type ContactRow } from "./actions";

function ContactCard({ contact }: { contact: ContactRow }) {
  const subtitle = [contact.role, contact.organization]
    .filter(Boolean)
    .join(" at ");

  return (
    <article className="card-lux space-y-3 p-5">
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold text-forest">
          {contact.name}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>
        )}
      </div>

      {(contact.email || contact.phone) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="font-medium text-brass-dark underline"
            >
              {contact.email}
            </a>
          )}
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="font-medium text-brass-dark underline"
            >
              {contact.phone}
            </a>
          )}
        </div>
      )}

      {contact.notes && (
        <p className="whitespace-pre-wrap text-sm text-ink-soft">
          {contact.notes}
        </p>
      )}

      <div className="flex gap-2 border-t border-ink/10 pt-3">
        <Link
          href={`/app/contacts/${contact.id}/edit`}
          className="btn-glass glass px-4 py-2 text-sm font-semibold text-forest"
        >
          Edit
        </Link>
        <DeleteButton
          action={deleteContact.bind(null, contact.id)}
          confirmText={`Delete ${contact.name}? This cannot be undone.`}
        />
      </div>
    </article>
  );
}

export default async function ContactsPage() {
  const supabase = await createClient();
  const businessId = await getBusinessId();

  let contacts: ContactRow[] = [];
  if (businessId) {
    const { data } = await supabase
      .from("contacts")
      .select("id, name, role, organization, email, phone, notes")
      .eq("business_id", businessId)
      .order("name", { ascending: true });
    contacts = (data ?? []) as ContactRow[];
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contacts"
        action={<AddButton href="/app/contacts/new" label="+ New contact" />}
      />

      {contacts.length === 0 ? (
        <EmptyState
          title="No contacts saved yet"
          body="Buyers, primes, and partners are relationships, not transactions. Keep every name you meet here, with notes on what they buy and when to follow up."
          ctaHref="/app/contacts/new"
          ctaLabel="Add your first contact"
        />
      ) : (
        <div className="space-y-4">
          {contacts.map((c) => (
            <ContactCard key={c.id} contact={c} />
          ))}
        </div>
      )}
    </div>
  );
}
