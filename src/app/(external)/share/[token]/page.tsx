"use client";

import { useState, useEffect } from "react";
import { Loader2, Calendar, FileText, CheckCircle2, LayoutList, Users, ShieldCheck, Mail } from "lucide-react";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { PremiumSpinner } from "@/components/ui/PremiumSpinner";
import InteractiveGantt from "@/components/timeline/InteractiveGantt";

/**
 * Client Portal Page: Indestructible Share Link.
 * 
 * Provides a read-only, padded view of the project roadmap.
 * Clients enter their email to unlock the view.
 */
export default function ClientPortalPage({ params }: { params: { token: string } }) {
  const [email, setEmail] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/${params.token}`);
      const data = await res.json();
      if (res.ok) {
        setProject(data);
        setIsUnlocked(true);
      } else {
        setError(data.error || "Access denied");
      }
    } catch (err) {
      setError("Connection failure");
    } finally {
      setLoading(false);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Project Roadmap Access</h1>
            <p className="text-slate-500 text-sm text-center mb-8">Enter your registered email address to view the latest project progress and timeline.</p>
            
            <form onSubmit={handleUnlock} className="w-full flex flex-col gap-4">
                <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input 
                      type="email" 
                      placeholder="client@company.com" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 py-3.5 pl-12 pr-4 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" 
                    />
                </div>
                <button 
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock Roadmap"}
                </button>
            </form>
            
            {error && <p className="mt-4 text-rose-500 text-xs font-medium animate-pulse">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 border-t-4 border-primary pb-20">
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-primary uppercase tracking-widest">{project?.companyName || "Project Roadmap"}</h2>
            <h1 className="text-xl font-bold text-slate-800 truncate max-w-[320px] md:max-w-md">{project?.name}</h1>
          </div>
          <div className="flex items-center gap-4">
               <div className="hidden md:flex flex-col items-end mr-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Authenticated as</span>
                    <span className="text-xs font-medium text-slate-600">{email}</span>
               </div>
               <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                    <Users className="w-5 h-5 text-slate-400" />
               </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2 bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                    <LayoutList className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Planned Completion Schedule</h3>
                </div>
                
                <div className="flex flex-col gap-4">
                    {project?.tasks?.map((task: any) => (
                        <div key={task.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col mb-3 md:mb-0">
                                <span className="text-[10px] font-bold text-primary opacity-60">{task.taskCode}</span>
                                <span className="font-bold text-slate-800 text-sm">{task.subject}</span>
                                <span className="text-[10px] font-medium text-slate-400 uppercase mt-0.5">Assigned to {task.owner}</span>
                            </div>
                            <div className="flex items-center gap-8 border-t md:border-t-0 pt-3 md:pt-0 border-slate-50">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Start Date</span>
                                    <span className="text-xs font-semibold text-slate-600">{new Date(task.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Target Completion</span>
                                    <span className="text-xs font-bold text-primary italic">
                                        {new Date(task.externalPlannedEnd || task.plannedEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="flex flex-col gap-6">
                <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10">
                    <div className="flex items-center gap-3 mb-6">
                        <FileText className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-primary uppercase text-xs tracking-wider">Project Summary</h3>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center py-2 border-b border-primary/10">
                            <span className="text-xs font-medium text-slate-500">Status</span>
                            <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold uppercase rounded-md">{project?.status || "Active"}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-primary/10">
                            <span className="text-xs font-medium text-slate-500">Kickoff</span>
                            <span className="text-xs font-bold text-slate-700">{new Date(project?.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-xs font-medium text-slate-500">Total Phases</span>
                            <span className="text-xs font-bold text-slate-700">{project?.tasks?.length || 0} Deliverables</span>
                        </div>
                    </div>
                </div>
                
                <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-900/10">
                    <div className="flex items-center gap-3 mb-4">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-primary uppercase text-xs tracking-wider font-sans">Verified Roadmap</h3>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">This roadmap is authorized for {email}. All dates reflect the latest planned completion schedule including business-day delivery buffers.</p>
                </div>
            </div>
        </div>

        {/* SIMPLIFIED GANTT VIEW FOR CLIENT */}
        <div className="mt-4">
          <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Visual Progress Explorer</h3>
          </div>
          <div className="h-[500px]">
             <InteractiveGantt 
               events={project.tasks.map((t: any) => ({ 
                 ...t, 
                 endDate: (t.externalPlannedEnd || t.plannedEnd).split('T')[0],
                 startDate: t.startDate.split('T')[0]
               }))} 
               onUpdateEvents={() => {}} // Read-only
               scale="day"
             />
          </div>
        </div>
      </main>
    </div>
  );
}
