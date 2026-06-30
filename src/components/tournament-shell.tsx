"use client";

import { useEffect, useState } from "react";
import { SidebarToggleContext } from "./sidebar-toggle-context";

export function TournamentShell({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("pz-sidebar") === "1");
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("pz-sidebar", next ? "1" : "0");
      return next;
    });

  return (
    <div
      className={`-mx-4 -mt-4 -mb-24 min-h-screen bg-app lg:-m-6 lg:grid ${
        collapsed ? "lg:grid-cols-1" : "lg:grid-cols-[260px_1fr]"
      }`}
    >
      <div className={`${collapsed ? "lg:hidden" : ""} lg:sticky lg:top-0 lg:self-start`}>{sidebar}</div>

      <div className="min-w-0 px-4 pt-4 pb-10 lg:px-8 lg:pt-5 lg:pb-10">
        <SidebarToggleContext.Provider value={{ collapsed, toggle }}>{children}</SidebarToggleContext.Provider>
      </div>
    </div>
  );
}
