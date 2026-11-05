"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app", label: "Dashboard", exact: true },
  { href: "/app/contracts", label: "Contracts", exact: false },
  { href: "/app/opportunities", label: "Opportunities", exact: false },
  { href: "/app/guide", label: "Guide", exact: false },
];

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export default function TabBar({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="tabbar-safe fixed inset-x-0 bottom-0 z-40">
      <div className="glass-forest mx-3 mb-3 rounded-3xl px-2 pt-2">
        <div className="grid grid-cols-5">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href, tab.exact);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center rounded-2xl px-1 py-2 text-[11px] font-semibold transition-colors ${
                  active ? "text-brass-light" : "text-ivory/70"
                }`}
              >
                <span
                  className={`mb-1 h-1.5 w-8 rounded-full ${
                    active ? "bg-brass-light" : "bg-transparent"
                  }`}
                />
                {tab.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={onMore}
            className={`flex flex-col items-center rounded-2xl px-1 py-2 text-[11px] font-semibold transition-colors ${
              pathname.startsWith("/app/more") ? "text-brass-light" : "text-ivory/70"
            }`}
          >
            <span className="mb-1 h-1.5 w-8 rounded-full bg-transparent" />
            More
          </button>
        </div>
      </div>
    </nav>
  );
}
