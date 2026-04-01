"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Sparkles, FolderOpen, X, Command } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CommandK() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; type: 'app' | 'project'; href: string }[]>([]);
  const [aiApps, setAiApps] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Load data once
  useEffect(() => {
    Promise.all([
      fetch("/api/apps").then(r => r.ok ? r.json() : []),
      fetch("/api/projects").then(r => r.ok ? r.json() : [])
    ]).then(([appsData, projectsData]) => {
      if (Array.isArray(appsData)) setAiApps(appsData.filter((a: any) => a.isActive));
      if (Array.isArray(projectsData)) setProjects(projectsData);
    }).catch(() => {});
  }, []);

  // Keyboard shortcut: CMD+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
    }
  }, [isOpen]);

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    const appMatches = aiApps.filter(a => a.name.toLowerCase().includes(q)).map(a => ({
      id: a.id, name: a.name, type: 'app' as const, href: a.href
    }));
    const projectMatches = projects.filter(p => p.name.toLowerCase().includes(q)).map(p => ({
      id: p.id, name: p.name, type: 'project' as const, href: `/tasks?project=${p.id}`
    }));

    setResults([...appMatches, ...projectMatches].slice(0, 8));
  }, [query, aiApps, projects]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200 overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-200">
        <div className="flex items-center px-4 h-14 border-b">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search Projects, AI Apps, or Hubs..." 
            className="flex-1 bg-transparent border-none outline-none text-slate-800 font-medium placeholder:text-slate-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-[10px] font-bold text-slate-400">
             <Command size={10}/> K
          </div>
          <button onClick={() => setIsOpen(false)} className="ml-3 p-1 hover:bg-slate-100 rounded-md text-slate-400"><X size={16}/></button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.map((res) => (
                <button
                  key={`${res.type}-${res.id}`}
                  onClick={() => {
                    router.push(res.href);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 text-left group transition-all"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm ${
                    res.type === 'app' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-blue-50 border-blue-100 text-blue-600'
                  }`}>
                    {res.type === 'app' ? <Sparkles size={16}/> : <FolderOpen size={16}/>}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">{res.name}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {res.type === 'app' ? 'AI Intelligence' : 'Contextual Project'}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          ) : query ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
               <Search size={32} className="opacity-20 mb-2"/>
               <p className="text-sm font-medium italic">No results found for "{query}"</p>
            </div>
          ) : (
            <div className="py-4 px-2">
               <div className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-2 px-2">Quick Access</div>
               <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => {router.push('/tasks'); setIsOpen(false);}} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-left">
                    <Zap size={14} className="text-primary"/> <span className="text-xs font-bold text-slate-600">Tasks Dashboard</span>
                  </button>
                  <button onClick={() => {router.push('/accounts'); setIsOpen(false);}} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-left">
                    <Building2 size={14} className="text-primary"/> <span className="text-xs font-bold text-slate-600">Accounts Hub</span>
                  </button>
               </div>
            </div>
          )}
        </div>
        
        <div className="px-4 py-3 bg-slate-50 border-t flex items-center justify-between">
           <div className="text-[9px] font-medium text-slate-400 uppercase tracking-widest flex items-center gap-3">
              <span>↑↓ to navigate</span>
              <span>Enter to select</span>
              <span>Esc to close</span>
           </div>
           <div className="text-[9px] font-black text-primary uppercase tracking-tighter italic opacity-40">CST FlowDesk Workspace</div>
        </div>
      </div>
    </div>
  );
}

import { Building2, ChevronRight, Zap } from "lucide-react";
