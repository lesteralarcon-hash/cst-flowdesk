"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";

interface SmartMicProps {
  onTranscription: (text: string) => void;
  onInterim?: (text: string) => void;
  meetingId?: string;
  disabled?: boolean;
  onToggle?: (listening: boolean) => void;
}

export default function SmartMic({
  onTranscription,
  onInterim,
  meetingId,
  disabled = false,
  onToggle,
}: SmartMicProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const wantsListeningRef = useRef(false);
  const onTranscriptionRef = useRef(onTranscription);
  const onInterimRef = useRef(onInterim);
  const meetingIdRef = useRef(meetingId);

  useEffect(() => { onTranscriptionRef.current = onTranscription; }, [onTranscription]);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);
  useEffect(() => { meetingIdRef.current = meetingId; }, [meetingId]);

  const buildRecognition = useCallback(() => {
    if (typeof window === "undefined") return null;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;

    const cleanBranding = (t: string) => t.replace(/\b(Turkey|Starkey|starkey|turkey)\b/g, "Tarkie");

    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.maxAlternatives = 1;

    r.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const rawText = result[0].transcript.trim();
          const text = cleanBranding(rawText);
          if (text) {
            onTranscriptionRef.current(text);
          }
        } else {
          interim += cleanBranding(result[0].transcript);
        }
      }
      setInterimText(interim);
      onInterimRef.current?.(interim);
    };

    r.onend = () => {
      setInterimText("");
      if (wantsListeningRef.current) {
        try { r.start(); } catch { /* already started */ }
      }
    };

    r.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (event.error === "not-allowed") {
        wantsListeningRef.current = false;
        setIsListening(false);
        setError('Mic blocked. Check permissions.');
        return;
      }
      setError(`Mic error: ${event.error}`);
    };

    return r;
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) return;
    const r = buildRecognition();
    if (!r) {
      setError("Not supported.");
      return;
    }
    recognitionRef.current = r;
    wantsListeningRef.current = true;
    setIsListening(true);
    setError(null);
    try { r.start(); } catch { /* ignore */ }
    onToggle?.(true);
  }, [buildRecognition, onToggle]);

  const stopListening = useCallback(() => {
    wantsListeningRef.current = false;
    setIsListening(false);
    setInterimText("");
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    onToggle?.(false);
  }, [onToggle]);

  return (
    <div className="flex items-center gap-2 relative min-w-[20px]">
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        title={isListening ? "Stop listening" : "Start listening"}
        className={`h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-all border ${
          isListening
            ? "bg-red-500 hover:bg-red-600 text-white border-red-600 shadow-sm shadow-red-200 animate-pulse"
            : "bg-white text-slate-400 hover:bg-slate-50 border-slate-200"
        } disabled:opacity-50`}
      >
        {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      </button>

      {/* Floating Listening Indicator to avoid layout shift */}
      {isListening && (
        <div className="absolute left-10 top-1/2 -translate-y-1/2 flex flex-col pointer-events-none whitespace-nowrap z-20">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 border border-red-100 shadow-sm">
             <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
             <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Listening...</span>
          </div>
          {interimText && (
            <div className="mt-1 px-2 py-0.5 rounded bg-white/80 backdrop-blur-sm border border-slate-100 text-[10px] text-slate-500 italic max-w-[200px] truncate shadow-sm">
              {interimText}
            </div>
          )}
        </div>
      )}
      
      {!isListening && error && (
        <div className="absolute left-10 top-1/2 -translate-y-1/2 text-[10px] text-red-500 font-medium whitespace-nowrap bg-white border border-red-100 px-2 py-1 rounded shadow-sm">
          {error}
        </div>
      )}
    </div>
  );
}
