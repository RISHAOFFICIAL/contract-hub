"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-glass btn-primary-glass px-6 py-2.5 text-sm print:hidden"
    >
      Print / Save as PDF
    </button>
  );
}
