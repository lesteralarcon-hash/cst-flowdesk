"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ChevronLeft, ChevronRight, ChevronDown,
  Compass, GitBranch, FileText, Clock, Zap,
  ShieldCheck, Settings, Building2, CalendarCheck,
  Paintbrush, LayoutGrid, FolderOpen, EyeOff, Eye,
  Archive, LayoutDashboard, Sparkles, Search
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
  { id: "admin", label: "Admin", href: "/admin", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
];

export default function LeftNav() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [autoCollapsed, setAutoCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  const [aiAppsOpen, setAiAppsOpen] = useState(false);
  const [aiApps, setAiApps] = useState<{ id: string; name: string; slug: string; href: string; icon: string | null }[]>([]);
  const [taskProjects, setTaskProjects] = useState<any[]>([]);
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

  // Fix: Only auto-collapse once when ENTERING focus mode
  useEffect(() => {
    if (isFocusPage && !autoCollapsed) {
      setIsCollapsed(true);
      setAutoCollapsed(true);
    } else if (!isFocusPage) {
      setAutoCollapsed(false);
    }
  }, [isFocusPage, autoCollapsed]);

  // Premium Hover Expansion with 300ms delay
  const handleMouseEnter = () => {
    if (!isCollapsed) return;
    hoverTimeout.current = setTimeout(() => setIsHovered(true), 300);
  };
  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setIsHovered(false);
  };

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
    if (isAiAppActive && (!isCollapsed || isHovered)) setAiAppsOpen(true);
  }, [isAiAppActive, isCollapsed, isHovered]);

  useEffect(() => {
    const proj = searchParams?.get("project");
    setActiveProjectId(proj ? proj : pathname?.startsWith("/tasks") ? "DASHBOARD" : "ALL");
  }, [pathname, searchParams]);

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
  const recentProjects = taskProjects.slice(0, 3);
  const activeProject = taskProjects.find(p => p.id === activeProjectId);
  const showActiveSeparately = activeProject && !recentProjects.find(p => p.id === activeProject.id) && activeProjectId !== "ALL" && activeProjectId !== "DASHBOARD";

  const isActive = (href: string) => {
    if (!mounted) return false;
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname?.startsWith(href)) return true;
    return false;
  };

  const isFloating = isCollapsed && isHovered;

  return (
    <div 
      className="relative shrink-0 transition-all duration-300 ease-in-out"
      style={{ width: isCollapsed ? 72 : 255 }}
    >
      <aside 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`left-nav transition-all duration-300 ease-in-out flex flex-col overflow-hidden border-r shadow-xl z-[100] ${
          isFloating ? "absolute left-0 top-0 h-full bg-white ring-4 ring-black/5" : "h-screen bg-slate-50/50"
        }`}
        style={{ width: isFloating ? 255 : (isCollapsed ? 72 : 255) }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 h-16 border-b shrink-0 bg-white ${isCollapsed && !isHovered ? "justify-center px-0" : ""}`}>
          {(!isCollapsed || isHovered) ? (
            <>
              <Link href="/" className="left-nav-logo flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white text-[10px] font-black">CST</span>
                </div>
                <span className="font-black text-slate-800 tracking-tighter text-sm uppercase leading-none">{appName || "FlowDesk"}</span>
              </Link>
              <button onClick={() => setIsCollapsed(true)} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 group-hover:scale-110 transition-transform"><ChevronLeft size={16}/></button>
            </>
          ) : (
            <Link href="/" className="p-1 bg-white rounded-lg shadow-sm border border-slate-100 hover:scale-110 transition-transform">
               <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                  <span className="text-white text-[10px] font-black">CST</span>
               </div>
            </Link>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 flex flex-col gap-1 styled-scroll bg-white">
          {(!isCollapsed || isHovered) ? (
            <>
              <Link href="/" className={`left-nav-item group/item ${isActive("/") ? "active" : ""}`}>
                <Compass size={18} className="group-hover/item:scale-110 transition-transform" /> <span>Explore</span>
              </Link>

              <Link href="/accounts" className={`left-nav-item group/item ${isActive("/accounts") ? "active" : ""}`}>
                <Building2 size={18} className="group-hover/item:scale-110 transition-transform" /> <span>Accounts Hub</span>
              </Link>

              <div className="mt-1">
                <button onClick={() => setAiAppsOpen(o => !o)} className={`left-nav-item w-full text-left group/item ${isAiAppActive ? "active" : ""}`}>
                  <Sparkles size={18} className="group-hover/item:scale-110 transition-transform" /> <span className="flex-1">AI Intelligence</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${aiAppsOpen ? "rotate-180" : ""}`} />
                </button>

                {aiAppsOpen && (
                  <div className="ml-3 mt-1 mb-1 space-y-0.5 border-l border-slate-100 pl-3">
                    {aiApps.map(item => (
                      <Link key={item.id} href={item.href} className={`flex items-center gap-3 px-2 py-2 rounded-md text-[11px] font-medium transition-all ${isActive(item.href) ? "text-primary bg-primary/5" : "text-slate-500 hover:bg-slate-50"}`}>
                        <div className="w-5 h-5 rounded flex items-center justify-center bg-slate-50 border border-slate-100 group-hover:shadow-sm">{ICON_MAP[item.icon ?? ""] ?? <Sparkles size={12} />}</div>
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-1">
                <Link href="/tasks" className={`left-nav-item group/item ${isTasksActive ? "active" : ""}`}>
                  <Zap size={18} className="group-hover/item:scale-110 transition-transform" /> <span>Tasks & Projects</span>
                </Link>

                {isTasksActive && (
                  <div className="ml-3 mt-1 mb-1 space-y-0.5 border-l border-slate-100 pl-3">
                    <Link href="/tasks" className={`flex items-center gap-2 px-2 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeProjectId === "DASHBOARD" ? "text-primary bg-primary/5" : "text-slate-400 hover:bg-slate-50"}`}>
                      <LayoutDashboard size={14} /> <span>My Dashboard</span>
                    </Link>
                    <div className="pt-2 px-2 pb-1 text-[9px] font-black uppercase tracking-widest text-slate-300">Contextual Projects</div>
                    {showActiveSeparately && activeProject && (
                      <Link href={`/tasks?project=${activeProject.id}`} className="flex items-center gap-3 px-2 py-2 rounded-md text-[11px] font-semibold text-primary bg-primary/5 border border-primary/10">
                        <FolderOpen size={14} /> <span className="truncate">{activeProject.name}</span>
                      </Link>
                    )}
                    {recentProjects.map(p => (
                      <Link key={p.id} href={`/tasks?project=${p.id}`} className={`flex items-center gap-3 px-2 py-2 rounded-md text-[11px] font-medium transition-all ${activeProjectId === p.id ? "text-primary bg-primary/5" : "text-slate-500 hover:bg-slate-50"}`}>
                        <FolderOpen size={14} className="opacity-30" /> <span className="truncate">{p.name}</span>
                      </Link>
                    ))}
                    <Link href="/tasks?project=ALL" className="flex items-center gap-1.5 px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary mt-1">
                      <LayoutGrid size={12} /> <span>Project Explorer...</span>
                    </Link>
                  </div>
                )}
              </div>

              {visibleAdminItems.length > 0 && (
                <div className="mt-auto pt-2 border-t">
                  {visibleAdminItems.map(item => (
                    <Link key={item.id} href={item.href} className={`left-nav-item group/item ${isActive(item.href) ? "active" : ""}`}>
                      <ShieldCheck size={18} className="group-hover/item:scale-110 transition-transform" /> <span>Settings</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center gap-3 w-full">
              <Link href="/" className={`p-3 rounded-xl transition-all ${isActive("/") ? "bg-primary/5 text-primary shadow-sm" : "hover:bg-slate-50 text-slate-400"}`} title="Explore"><Compass size={20}/></Link>
              <Link href="/accounts" className={`p-3 rounded-xl transition-all ${isActive("/accounts") ? "bg-primary/5 text-primary shadow-sm" : "hover:bg-slate-50 text-slate-400"}`} title="Accounts"><Building2 size={20}/></Link>
              <Link href="/tasks" className={`p-3 rounded-xl transition-all ${isTasksActive ? "bg-primary/5 text-primary shadow-sm" : "hover:bg-slate-50 text-slate-400"}`} title="Tasks"><Zap size={20}/></Link>
              <div className="h-px w-8 bg-slate-100 my-1" />
              <button onClick={() => setIsCollapsed(false)} className={`p-3 rounded-xl transition-all ${isAiAppActive ? "bg-primary/5 text-primary shadow-sm" : "hover:bg-slate-50 text-slate-400"}`} title="AI Workspace"><Sparkles size={20}/></button>
              {visibleAdminItems.length > 0 && (
                <Link href="/admin" className={`p-3 rounded-xl transition-all ${isActive("/admin") ? "bg-primary/5 text-primary shadow-sm" : "hover:bg-slate-50 text-slate-400"}`} title="Settings"><ShieldCheck size={20}/></Link>
              )}
            </div>
          )}
        </div>

        <div className={`p-4 border-t shrink-0 flex items-center justify-center bg-white ${isCollapsed && !isHovered ? "opacity-0 invisible" : "opacity-100 visible transition-all duration-500 delay-150"}`}>
           <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
             {isCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
           </button>
        </div>

        {bottomLogo && (!isCollapsed || isHovered) && (
          <div className="p-4 border-t shrink-0 bg-slate-50/50">
            <img src={bottomLogo} alt={appName} className="max-h-8 w-auto object-contain mx-auto opacity-60" />
          </div>
        )}
      </aside>
    </div>
  );
}
