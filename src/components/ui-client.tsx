"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  label,
  pendingLabel = "Saving...",
}: {
  label: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-glass btn-primary-glass w-full px-6 py-3 text-sm disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function DeleteButton({
  action,
  label = "Delete",
  confirmText = "Delete this item? This cannot be undone.",
}: {
  action: (formData: FormData) => Promise<void>;
  label?: string;
  confirmText?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="btn-glass glass px-4 py-2 text-sm font-semibold text-[#8c3b2e]"
      >
        {label}
      </button>
    </form>
  );
}
