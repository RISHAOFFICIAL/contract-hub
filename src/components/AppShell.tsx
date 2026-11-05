"use client";

import { useState } from "react";
import TabBar from "@/components/TabBar";
import MoreSheet from "@/components/MoreSheet";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ivory">
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-6">{children}</div>
      <TabBar onMore={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}
