export const AD_CATEGORIES = [
  "Suppliers",
  "Contractors",
  "Subcontractors",
  "Consultants and Advisors",
  "Training",
  "Software and Tools",
  "Bonding and Insurance",
  "Other",
] as const;

export const AD_PACKAGES = [
  { value: "starter", label: "Starter", price: 49 },
  { value: "featured", label: "Featured", price: 99 },
  { value: "spotlight", label: "Spotlight", price: 199 },
] as const;

export function packageLabel(pkg: string | null): string {
  return AD_PACKAGES.find((p) => p.value === pkg)?.label ?? pkg ?? "";
}

export function packagePrice(pkg: string | null): number | null {
  return AD_PACKAGES.find((p) => p.value === pkg)?.price ?? null;
}
