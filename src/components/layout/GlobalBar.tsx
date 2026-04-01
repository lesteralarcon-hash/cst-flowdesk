"use client";

import React from "react";
import { Bell, ChevronDown } from "lucide-react";
import UserButton from "@/components/auth/UserButton";
import { useBreadcrumbs } from "@/lib/contexts/BreadcrumbContext";
import Link from "next/link";

interface GlobalBarProps {
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

export default function GlobalBar({ 
  breadcrumbs: propBreadcrumbs, 
  actions: propActions 
}: GlobalBarProps) {
  const { breadcrumbs: contextBreadcrumbs, actions: contextActions } = useBreadcrumbs();
  
  // Use props if provided, otherwise context
  const breadcrumbs = propBreadcrumbs || contextBreadcrumbs;
  const actions = propActions || contextActions;

  return (
    <div className="nav-bar sticky top-0 z-[60] bg-white/80 backdrop-blur-md">
      {/* Left: Breadcrumb */}
      <div className="nav-bar-left">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="hidden sm:flex items-center gap-1.5">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-text-secondary text-[10px] opacity-40">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="text-[11px] font-bold text-slate-500 hover:text-primary transition-colors flex items-center gap-1">
                    {crumb.label}
                    {idx < breadcrumbs.length - 1 && <ChevronDown className="w-2.5 h-2.5 opacity-20" />}
                  </Link>
                ) : (
                  <span className="text-[11px] font-black text-slate-800 tracking-tight">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>

      {/* Right: custom actions + bell + profile */}
      <div className="nav-bar-right">
        {actions}
        <div className="h-4 w-px bg-slate-100 mx-1" />
        <button
          className="p-1.5 rounded-xl hover:bg-surface-muted transition-colors text-text-secondary hover:text-text-primary relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
        </button>
        <UserButton />
      </div>
    </div>
  );
}
