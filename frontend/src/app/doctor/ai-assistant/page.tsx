"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Mic, Square, Loader2, ArrowLeft, Stethoscope, Activity, MessageCircle, Clock, Globe, AlertCircle } from "lucide-react";
import Link from "next/link";

interface ClinicalSummary {
  symptoms: string[];
  duration_mentions: string[];
  summary: string;
  source?: string;
}

const LANGUAGES = [
  { code: "", label: "Auto-Detect" },
  { code: "en-US", label: "English" },
  { code: "hi-IN", label: "Hindi" },
  { code: "es-ES", label: "Spanish" },
  { code: "fr-FR", label: "French" },
  { code: "ar-SA", label: "Arabic" },
  { code: "zh-CN", label: "Mandarin" },
  { code: "de-DE", label: "German" },
  { code: "pt-BR", label: "Portuguese" },
  { code: "ja-JP", label: "Japanese" },
  { code: "ko-KR", label: "Korean" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "bn-IN", label: "Bengali" },
  { code: "mr-IN", label: "Marathi" },
];

const PRIORITY_COLORS: Record<string, { badge: string }> = {
  CRITICAL: { badge: "bg-[var(--emergency-red)] shadow-[var(--emergency-red)]/20" },
  HIGH:     { badge: "bg-[#F97316] shadow-[#F97316]/20" },
  MEDIUM:   { badge: "bg-[var(--warning-yellow)] shadow-[var(--warning-yellow)]/20" },
  LOW:      { badge: "bg-[var(--success-green)] shadow-[var(--success-green)]/20" },
};

export default function DoctorAIAssistant() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clinicalData, setClinicalData] = useState<ClinicalSummary | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [finalTranscriptText, setFinalTranscriptText] = useState("");
  const [selectedLang, setSelectedLang] = useState("");

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Accumulates the full transcript across recognition restarts
  const fullTranscriptRef = useRef("");

  // ──────────────────────────────────────────────────────
  // START recording
  // ──────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    fullTranscriptRef.current = "";
    setLiveTranscript("");
    setClinicalData(null);
    setFinalTranscriptText("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Your browser does not support speech recognition. Please use Google Chrome or Microsoft Edge.");
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      // Multilingual support — empty string lets the browser auto-detect
      if (selectedLang) {
        recognition.lang = selectedLang;
      }

      recognition.onresult = (event: any) => {
        let accumulated = "";
        for (let i = 0; i < event.results.length; i++) {
          accumulated += event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            accumulated += " ";
          }
        }
        const cleaned = accumulated.trim();
        fullTranscriptRef.current = cleaned;
        setLiveTranscript(cleaned);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
      };

      recognition.onend = () => {
        // Auto-restart for long conversations (Chrome stops after ~60s)
        if (isRecordingRef.current) {
          try { recognition.start(); } catch {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      isRecordingRef.current = true;
      setIsRecording(true);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  }, [selectedLang]);

  // ──────────────────────────────────────────────────────
  // STOP recording + send to backend
  // ──────────────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });

      streamRef.current?.getTracks().forEach(t => t.stop());
      await new Promise(r => setTimeout(r, 400));

      // Use the accumulated transcript
      const finalTranscript = fullTranscriptRef.current.trim();

      if (!finalTranscript) {
        alert("No speech was detected. Please speak clearly and try again.");
        return;
      }

      setFinalTranscriptText(finalTranscript);
      setLoading(true);

      try {
        const res = await fetch("http://localhost:5000/api/ai/summarize-consultation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcription: finalTranscript }),
        });

        if (!res.ok) throw new Error("Server error");
        const data: ClinicalSummary = await res.json();
        setClinicalData(data);
      } catch (error) {
        console.error("AI summarization failed:", error);
        setClinicalData({
          symptoms: ["Could not reach server"],
          duration_mentions: [],
          summary: finalTranscript.substring(0, 200),
        });
      } finally {
        setLoading(false);
      }
    }
  }, []);

  // Priority heuristic from symptom count
  const getPriority = (data: ClinicalSummary) => {
    const hasSevere = data.symptoms.some(s =>
      ['severe','intense','chronic','worsening','unbearable','extreme','terrible','acute'].some(word => s.toLowerCase().includes(word))
    );
    if (hasSevere && data.symptoms.length >= 2) return "CRITICAL";
    if (hasSevere || data.symptoms.length >= 4) return "HIGH";
    if (data.symptoms.length >= 2) return "MEDIUM";
    return "LOW";
  };

  const priority = clinicalData ? getPriority(clinicalData) : "MEDIUM";
  const priorityStyle = PRIORITY_COLORS[priority] || PRIORITY_COLORS.MEDIUM;

  return (
    <div className="min-h-screen p-6 md:p-10 relative bg-[var(--background)] font-[family-name:var(--font-inter)] text-[var(--foreground)] overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-10 right-[-10%] w-[500px] h-[500px] bg-[var(--primary-gradient-end)]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[40%] left-[-10%] w-[300px] h-[300px] bg-[var(--primary-gradient-start)]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 pt-4">
         <Link href="/doctor/dashboard" className="inline-flex items-center text-[var(--secondary)] hover:text-[var(--primary-gradient-start)] mb-8 transition-colors text-sm font-medium border hover:border-[var(--primary-gradient-start)]/30 px-3 py-1.5 rounded-full bg-[var(--card-bg)] shadow-sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>
        
        <div className="flex items-center gap-4 mb-10">
           <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary-gradient-start)]/10 to-[var(--primary-gradient-end)]/10 border border-[var(--primary-gradient-start)]/20 flex items-center justify-center shadow-sm">
            <Mic className="w-7 h-7 text-[var(--primary-gradient-start)]" />
          </div>
          <div>
            <h1 className="text-4xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)] tracking-tight mb-1">AI Voice Assistant</h1>
            <p className="text-[var(--secondary)]">Record patient consultations to automatically extract key clinical points.</p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center justify-center gap-3 mb-8">
           <Globe className="w-4 h-4 text-[var(--secondary)]" />
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            disabled={isRecording}
             className="bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--foreground)] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--primary-gradient-start)]/30 focus:border-[var(--primary-gradient-start)]/50 disabled:opacity-50 cursor-pointer shadow-sm transition-all"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </select>
           <span className="text-xs text-[var(--secondary)] font-medium">Input Language</span>
        </div>

        {/* Record / Stop Button */}
        <div className="flex justify-center mb-10 relative">
          {/* Subtle pulse ring behind the button when idle (optional flair) */}
          {!isRecording && !loading && <div className="absolute inset-0 m-auto w-32 h-32 rounded-full border border-[var(--primary-gradient-start)]/20 animate-ping opacity-30 pointer-events-none" style={{ animationDuration: '3s' }} />}
          
          {!isRecording ? (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startRecording}
              disabled={loading}
               className="w-36 h-36 bg-[var(--card-bg)] border-2 border-[var(--primary-gradient-start)]/30 rounded-full flex flex-col items-center justify-center text-[var(--primary-gradient-start)] hover:bg-[var(--primary-gradient-start)]/5 transition-all group disabled:opacity-50 shadow-md relative z-10"
            >
              {loading ? <Loader2 className="w-10 h-10 animate-spin" /> : <Mic className="w-12 h-12 mb-2 group-hover:scale-110 transition-transform" />}
              <span className="font-semibold text-sm">{loading ? "Processing..." : "Tap to Record"}</span>
            </motion.button>
          ) : (
             <motion.button 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={stopRecording}
               className="w-36 h-36 bg-[var(--emergency-red)]/10 border-2 border-[var(--emergency-red)] rounded-full flex flex-col items-center justify-center text-[var(--emergency-red)] transition-all group relative shadow-md z-10"
            >
               <div className="absolute inset-0 rounded-full bg-[var(--emergency-red)]/20 animate-ping" style={{ animationDuration: '2s' }} />
               <Square className="w-10 h-10 mb-2 fill-current relative z-10" />
              <span className="font-bold text-sm relative z-10">Stop Recording</span>
            </motion.button>
          )}
        </div>

        {/* Live Transcript Area */}
        {(isRecording || liveTranscript) && !clinicalData && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-12 max-w-2xl mx-auto">
             <div className="bg-[var(--card-bg)] border border-[var(--primary-gradient-start)]/20 p-8 rounded-2xl shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary-gradient-start)] to-[var(--primary-gradient-end)] opacity-50" />
              <div className="flex items-center gap-2 mb-4">
                 {isRecording && <div className="w-2.5 h-2.5 rounded-full bg-[var(--emergency-red)] animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />}
                 <span className="text-[11px] font-bold text-[var(--secondary)] uppercase tracking-widest">
                  {isRecording ? "Live Transcription" : "Transcription Complete"}
                </span>
              </div>
               <p className="text-[var(--foreground)] text-lg leading-relaxed font-medium">
                 {liveTranscript || <span className="text-[var(--secondary)]/50 italic font-normal">Listening... start speaking naturally.</span>}
              </p>
            </div>
          </motion.div>
        )}

        {/* ═══════════ RESULTS ═══════════ */}
        {clinicalData && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Transcribed Speech Card */}
            {finalTranscriptText && (
               <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-7 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                   <MessageCircle className="w-4 h-4 text-[var(--secondary)]/70" />
                   <h4 className="text-[11px] font-bold text-[var(--secondary)] uppercase tracking-widest">Transcribed Speech</h4>
                </div>
                 <p className="text-[var(--foreground)]/90 text-sm leading-relaxed">{finalTranscriptText}</p>
              </div>
            )}

            {/* Clinical Key Points Card */}
             <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden">
               <div className="p-7 border-b border-[var(--border-color)] bg-[var(--background)]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-[var(--primary-gradient-start)]/10 rounded-lg text-[var(--primary-gradient-start)]">
                     <Stethoscope className="w-5 h-5" />
                   </div>
                   <h3 className="text-2xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)] text-shadow-sm">Clinical Consultation</h3>
                </div>
                {/* Triage Priority Badge */}
                 <div className="flex items-center gap-3">
                   <span className="text-xs text-[var(--secondary)] font-bold uppercase tracking-widest">Triage Priority</span>
                   <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-sm ${priorityStyle.badge}`}>
                    {priority}
                  </div>
                 </div>
              </div>

               <div className="p-7 space-y-6 bg-white">
                {/* Symptoms Mentioned */}
                {clinicalData.symptoms.length > 0 && (
                   <div className="bg-[var(--background)]/80 p-5 rounded-xl border border-[var(--border-color)]">
                     <div className="flex items-center gap-2 mb-3 text-[var(--primary-gradient-start)]">
                      <Activity className="w-4 h-4" />
                       <h4 className="text-sm font-bold uppercase tracking-wider">Symptoms Mentioned</h4>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {clinicalData.symptoms.map((symptom, i) => (
                         <div key={i} className="flex items-start gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary-gradient-start)]/60 mt-2 flex-shrink-0" />
                           <p className="text-[var(--foreground)] font-medium text-sm leading-relaxed">{symptom}</p>
                         </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Duration */}
                {clinicalData.duration_mentions.length > 0 && (
                  <div>
                     <div className="bg-[var(--success-green)]/5 p-5 rounded-xl border border-[var(--success-green)]/15">
                       <div className="flex items-center gap-2 mb-3 text-[var(--success-green)]">
                        <Clock className="w-4 h-4" />
                         <h4 className="text-sm font-bold uppercase tracking-wider">Duration</h4>
                      </div>
                      <div className="space-y-2">
                        {clinicalData.duration_mentions.map((d, i) => (
                           <div key={i} className="flex items-start gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-[var(--success-green)]/60 mt-1.5 flex-shrink-0" />
                             <p className="text-[var(--foreground)] font-medium text-sm">{d}</p>
                           </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary */}
                {clinicalData.summary && (
                   <div className="bg-gradient-to-r from-[var(--primary-gradient-start)]/5 to-[var(--primary-gradient-end)]/5 p-5 rounded-xl border border-[var(--primary-gradient-start)]/10 mt-2 relative">
                     <div className="absolute top-2 left-2 text-4xl text-[var(--primary-gradient-start)]/20 font-serif leading-none">"</div>
                     <p className="text-[var(--foreground)]/90 text-[15px] leading-relaxed italic relative z-10 px-2 font-medium">{clinicalData.summary}</p>
                  </div>
                )}

                {/* Source indicator */}
                {clinicalData.source && (
                   <div className="flex justify-end items-center gap-1 mt-4 pt-4 border-t border-[var(--border-color)]">
                     <Activity className="w-3 h-3 text-[var(--secondary)]" />
                     <p className="text-[11px] text-[var(--secondary)] uppercase tracking-wider font-semibold">
                      Processed by: {clinicalData.source === 'gemini-ai' ? 'Gemini AI' : 'Keyword Extraction'}
                    </p>
                  </div>
                )}
               </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
