"use client";

import React, { useState, useEffect } from "react";
import { X, Timer, CheckCircle2 } from "lucide-react";

interface BufferModalProps {
  taskId: string;
  taskSubject: string;
  currentPadding: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (padding: number) => void;
}

export default function BufferModal({
  taskId,
  taskSubject,
  currentPadding,
  isOpen,
  onClose,
  onSave
}: BufferModalProps) {
  const [padding, setPadding] = useState(currentPadding);

  useEffect(() => {
    setPadding(currentPadding);
  }, [currentPadding, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[340px] overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">Client Leg Room</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
           <div className="mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Applying to:</p>
              <p className="text-[12px] font-bold text-slate-700 truncate line-clamp-1 italic">{taskSubject}</p>
           </div>

           <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Buffer Days (Business Days)</label>
                <div className="flex items-center gap-3">
                   <input 
                    type="number"
                    min="0"
                    max="30"
                    value={padding}
                    onChange={(e) => setPadding(parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-center"
                   />
                   <span className="text-[11px] font-bold text-slate-400 uppercase">Days</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed italic">
                 Note: Weekends are automatically skipped. This padding will only affect the Client-facing deadline.
              </p>
           </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-50/50 border-t flex gap-2">
           <button 
            onClick={onClose}
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-500 hover:bg-slate-100 transition-all uppercase tracking-widest"
           >
             Cancel
           </button>
           <button 
            onClick={() => onSave(padding)}
            className="flex-1 px-3 py-2 bg-primary text-white rounded-xl text-[11px] font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest"
           >
             <CheckCircle2 className="w-3 h-3" strokeWidth={3} /> Save Buffer
           </button>
        </div>
      </div>
    </div>
  );
}
