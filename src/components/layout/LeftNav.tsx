"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ChevronLeft, ChevronRight, ChevronDown,
  Compass, GitBranch, FileText, Clock, Zap,
  ShieldCheck, Settings, Building2, CalendarCheck,
  Paintbrush, LayoutGrid, FolderOpen, EyeOff, Eye,
  Archive, LayoutDashboard, Sparkles,
} from "lucide-react";

// ── Icon map for DB-driven apps ──────────────────────────────────
const ICON_MAP: Record<string, React.ReactNode> = {
  CalendarCheck: <CalendarCheck className="w-3 h-3" />,
  GitBranch:     <GitBranch     className="w-3 h-3" />,
  FileText:      <FileText      className="w-3 h-3" />,
  Paintbrush:    <Paintbrush    className="w-3 h-3" />,
  Clock:         <Clock         className="w-3 h-3" />,
  Sparkles:      <Sparkles      className="w-3 h-3" />,
};

const ADMIN_ITEMS = [
  { id: "admin",    label: "Admin",    href: "/admin",    icon: <ShieldCheck className="w-3.5 h-3.5" /> },
];

export default function LeftNav() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [aiAppsOpen, setAiAppsOpen] = useState(false);
  const [aiApps, setAiApps] = useState<{ id: string; name: string; slug: string; href: string; icon: string | null }[]>([]);
  const [taskProjects, setTaskProjects] = useState<any[]>([]);
  const [hiddenProjects, setHiddenProjects] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string>("DASHBOARD");
  const [bottomLogo, setBottomLogo] = useState<string | null>(null);
  const [appName, setAppName] = useState<string>("Team OS");
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const isFocusPage = pathname?.startsWith("/architect") || pathname?.startsWith("/brd") || pathname?.startsWith("/timeline") || pathname?.startsWith("/admin");
  const isAiAppActive = aiApps.some(a => pathname?.startsWith(a.href));
  const isTasksActive = pathname?.startsWith("/tasks") ?? false;
  
  useEffect(() => setMounted(true), []);

  // Auto-collapse logic for Focus Mode
  useEffect(() => {
    if (isFocusPage) setIsCollapsed(true);
    else setIsCollapsed(false);
  }, [isFocusPage]);

  // Load AI apps from DB once
  useEffect(() => {
    fetch("/api/apps")
      .then(r => r.ok ? r.json() : [])
      .then(data => { 
        if (Array.isArray(data)) {
          setAiApps(data.filter((a: any) => a.isActive && !["meeting-prep", "tasks"].includes(a.slug))); 
        }
      })
      .catch(() => {});

    // Load global settings
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(data => {
        if (data.bottom_logo_url) setBottomLogo(data.bottom_logo_url);
        if (data.app_name) setAppName(data.app_name);
      })
      .catch(() => {});
  }, []);


  // Auto-expand AI Apps group when on any AI app route (unless collapsed)
  useEffect(() => {
    if (isAiAppActive && !isCollapsed) setAiAppsOpen(true);
  }, [isAiAppActive, isCollapsed]);

  // Read active project from URL after mount / navigation
  useEffect(() => {
    const proj = searchParams?.get("project");
    setActiveProjectId(proj ? proj : pathname?.startsWith("/tasks") ? "DASHBOARD" : "ALL");
  }, [pathname, searchParams]);

  // Fetch projects when entering tasks section
  useEffect(() => {
    if (isTasksActive && taskProjects.length === 0) {
      fetch("/api/projects")
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setTaskProjects(data.filter((p: any) => p.templateType !== "account-maintenance"));
          }
        })
        .catch(() => {});
    }
  }, [isTasksActive]);

  if (status === "loading") return null;
  if (!session) return null;

  const visibleAdminItems = (session.user as any)?.role === "admin" ? ADMIN_ITEMS : [];
  
  // Refactored Project Sidebar logic: Only show Top 3 or Active
  const recentProjects = taskProjects.slice(0, 3);
  const activeProject = taskProjects.find(p => p.id === activeProjectId);
  const showActiveSeparately = activeProject && !recentProjects.find(p => p.id === activeProject.id) && activeProjectId !== "ALL" && activeProjectId !== "DASHBOARD";

  const isActive = (href: string) => {
    if (!mounted) return false;
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname?.startsWith(href)) return true;
    return false;
  };

  // ── COLLAPSED VIEW (ICON STRIP) ──────────────────────────────────
  if (isCollapsed) {
    return (
      <nav className="left-nav collapsed group/nav" style={{ width: 72 }}>
        <div className="flex flex-col items-center h-full py-4 gap-4">
          <Link href="/" className="mb-2 p-1 bg-white rounded-lg shadow-sm border border-slate-100 hover:scale-110 transition-transform">
             <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <span className="text-white text-[10px] font-black">CST</span>
             </div>
          </Link>
          
          <div className="flex-1 flex flex-col items-center gap-2 w-full px-2">
            <Link href="/" className={`p-3 rounded-xl transition-all ${isActive("/") ? "bg-primary/10 text-primary shadow-sm" : "hover:bg-surface-muted text-text-secondary"}`} title="Explore"><Compass size={20}/></Link>
            <Link href="/accounts" className={`p-3 rounded-xl transition-all ${isActive("/accounts") ? "bg-primary/10 text-primary shadow-sm" : "hover:bg-surface-muted text-text-secondary"}`} title="Accounts"><Building2 size={20}/></Link>
            <Link href="/tasks" className={`p-3 rounded-xl transition-all ${isTasksActive ? "bg-primary/10 text-primary shadow-sm" : "hover:bg-surface-muted text-text-secondary"}`} title="Tasks"><Zap size={20}/></Link>
            
            <div className="h-px w-8 bg-slate-100 my-2" />
            
            <button onClick={() => { setIsCollapsed(false); setAiAppsOpen(true); }} className={`p-3 rounded-xl transition-all ${isAiAppActive ? "bg-primary/10 text-primary shadow-sm" : "hover:bg-surface-muted text-text-secondary"}`} title="AI Apps"><Sparkles size={20}/></button>
            
            {visibleAdminItems.length > 0 && (
              <Link href="/admin" className={`p-3 rounded-xl transition-all ${isActive("/admin") ? "bg-primary/10 text-primary shadow-sm" : "hover:bg-surface-muted text-text-secondary"}`} title="Admin"><ShieldCheck size={20}/></Link>
            )}
          </div>

          <button onClick={() => setIsCollapsed(false)} className="p-3 hover:bg-surface-muted text-text-muted rounded-xl transition-all" title="Expand Sidebar">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </nav>
    );
  }

  // ── EXPANDED VIEW (FULL LABELS) ───────────────────────────────────
  return (
    <nav className="left-nav animate-in slide-in-from-left duration-300">
      {/* Header */}
      <div className="left-nav-header">
        <Link href="/" className="left-nav-logo bg-white p-1 rounded-lg">
          <img 
            src="https://www.tarkie.com/wp-content/uploads/2025/09/tarkie-logo-navbar.svg" 
            alt={appName || "Tarkie"} 
            className="h-6 w-auto object-contain"
          />
        </Link>
        <button onClick={() => setIsCollapsed(true)} className="p-1 rounded-md hover:bg-surface-muted transition-colors" title="Collapse navigation">
          <ChevronLeft className="w-4 h-4 text-text-muted" />
        </button>
      </div>


      {/* Nav Items */}
      <div className="left-nav-items styled-scroll">

        {/* Explore */}
        <Link
          href="/"
          className={`left-nav-item ${isActive("/") ? "active" : ""}`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Explore</span>
        </Link>

        {/* Accounts */}
        <Link
          href="/accounts"
          className={`left-nav-item ${isActive("/accounts") ? "active" : ""}`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Accounts Hub</span>
        </Link>

        {/* AI Apps group */}
        <div className="mt-1">
          <button
            onClick={() => setAiAppsOpen(o => !o)}
            className={`left-nav-item w-full text-left ${isAiAppActive ? "active" : ""}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="flex-1">AI Intelligence</span>
            <ChevronDown
              className={`w-3 h-3 text-text-muted transition-transform duration-200 ${aiAppsOpen ? "rotate-180" : ""}`}
            />
          </button>

          {aiAppsOpen && (
            <div className="ml-3 mt-0.5 mb-1 space-y-0.5 border-l border-slate-100 pl-2">
              {aiApps.map(item => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                    isActive(item.href)
                      ? "text-primary bg-primary/1"
                      : "text-text-secondary hover:bg-surface-muted"
                  }`}
                >
                  <div className="w-4 h-4 rounded-md flex items-center justify-center bg-white border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                    {ICON_MAP[item.icon ?? ""] ?? <Sparkles className="w-2.5 h-2.5" />}
                  </div>
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Tasks (with project switcher) */}
        <div className="mt-1">
          <Link
            href="/tasks"
            className={`left-nav-item ${isTasksActive ? "active" : ""}`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Tasks & Projects</span>
          </Link>

          {isTasksActive && (
            <div className="ml-3 mt-1 mb-1 space-y-0.5 border-l border-slate-100 pl-2">
              <Link
                href="/tasks"
                className={`flex items-center gap-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                  activeProjectId === "DASHBOARD" ? "text-primary bg-primary/5" : "text-text-secondary hover:bg-surface-muted"
                }`}
              >
                <LayoutDashboard className="w-2.5 h-2.5 shrink-0" />
                <span>My Dashboard</span>
              </Link>
              
              <div className="pt-2 pb-1 px-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Contextual Projects</span>
              </div>

              {/* Show Active first if not in recents */}
              {showActiveSeparately && (
                <Link
                  href={`/tasks?project=${activeProject.id}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-semibold text-primary bg-primary/5 border border-primary/10"
                >
                  <FolderOpen className="w-3 h-3 shrink-0" />
                  <span className="truncate">{activeProject.name}</span>
                </Link>
              )}

              {/* Show Recent 3 */}
              {recentProjects.map(p => (
                <Link
                  key={p.id}
                  href={`/tasks?project=${p.id}`}
                  className={`flex items-center gap-2 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                    activeProjectId === p.id ? "text-primary bg-primary/5" : "text-text-secondary hover:bg-surface-muted"
                  }`}
                >
                  <FolderOpen className="w-3 h-3 shrink-0 opacity-40" />
                  <span className="truncate">{p.name}</span>
                </Link>
              ))}

              <Link
                href="/tasks?project=ALL"
                className="flex items-center gap-2 px-2 py-2 mt-1 rounded-md text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <LayoutGrid className="w-3 h-3" />
                <span>Project Navigator...</span>
              </Link>
            </div>
          )}
        </div>

        {/* Admin / Settings (admin only) */}
        {visibleAdminItems.length > 0 && (
          <div className="mt-auto pt-2 border-t border-slate-100">
            {visibleAdminItems.map(item => (
              <Link
                key={item.id}
                href={item.href}
                className={`left-nav-item ${isActive(item.href) ? "active" : ""}`}
                title={item.label}
              >
                <div className="w-5 h-5 rounded-md bg-slate-50 flex items-center justify-center text-slate-500">
                  {item.icon}
                </div>
                <span>Settings</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="left-nav-footer">
        {bottomLogo ? (
          <div className="w-full flex items-center justify-center p-2">
            <img 
              src={bottomLogo} 
              alt={appName} 
              className="max-h-12 w-auto object-contain opacity-80" 
            />
          </div>
        ) : (
          <div className="w-full h-10 bg-surface-muted rounded-md flex items-center justify-center text-text-secondary text-[10px] font-black uppercase tracking-widest opacity-40">
            {appName}
          </div>
        )}
      </div>

    </nav>
  );
}
