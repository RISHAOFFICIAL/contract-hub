"use client";

export default function ReportAdButton({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Report this ad?")) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="text-xs font-semibold text-ink-faint underline"
      >
        Report this ad
      </button>
    </form>
  );
}
