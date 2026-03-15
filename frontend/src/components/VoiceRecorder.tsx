"use client";

import React, { useState, useRef, useCallback } from "react";
import { Mic, Square, Loader2, RotateCcw, Globe } from "lucide-react";
import { motion } from "framer-motion";

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

export default function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedLang, setSelectedLang] = useState("");

  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const fullTranscriptRef = useRef("");

  const startRecording = useCallback(async () => {
    try {
      // Setup Web Speech API for live transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        alert("Your browser does not support speech recognition. Please use Google Chrome or Microsoft Edge.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      // Multilingual support
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
        setTranscript(cleaned);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
      };

      recognition.onend = () => {
        // Auto-restart if we're still actively recording (handles Chrome's 1-min timeout)
        if (isRecordingRef.current) {
          try {
            recognition.start();
          } catch {
            // Already started or disposed
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      isRecordingRef.current = true;
      setIsRecording(true);
      setStatusMessage("");
      
      // Only clear if starting fresh, don't clear if user just paused/resumed
      if (!transcript) {
        fullTranscriptRef.current = "";
        setTranscript("");
      }

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  }, [transcript, selectedLang]);

  const stopRecording = useCallback(async () => {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    const finalTranscript = fullTranscriptRef.current.trim();
    if (!finalTranscript) {
      setStatusMessage("No speech detected.");
      return;
    }

    setLoading(true);
    setStatusMessage("Sending to backend...");

    try {
      // POST to backend as required
      const response = await fetch("http://localhost:5000/api/ai/process-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: finalTranscript })
      });

      if (!response.ok) throw new Error("API request failed");
      
      setStatusMessage("Transcript processed successfully!");
    } catch (error) {
      console.error("Backend error:", error);
      setStatusMessage("Failed to send transcript to server.");
    } finally {
      setLoading(false);
    }
  }, []);

  const clearTranscript = () => {
    if (isRecording) stopRecording();
    fullTranscriptRef.current = "";
    setTranscript("");
    setStatusMessage("");
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-lg">
      {/* Language Selector */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <Globe className="w-4 h-4 text-[#94A3B8]" />
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          disabled={isRecording}
          className="bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--primary-gradient-start)] disabled:opacity-50 cursor-pointer"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>{lang.label}</option>
          ))}
        </select>
        <span className="text-xs text-[#94A3B8]">Speech language</span>
      </div>

      <div className="flex flex-col items-center mb-8">
        
        {/* Record / Stop Button */}
        {!isRecording ? (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startRecording}
            disabled={loading}
            className="w-24 h-24 bg-white border-2 border-[var(--primary-gradient-start)]/40 rounded-full flex flex-col items-center justify-center text-[var(--primary-gradient-start)] hover:bg-[var(--primary-gradient-start)]/5 transition-all group disabled:opacity-50 shadow-md"
          >
            {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Mic className="w-8 h-8 group-hover:scale-110 transition-transform" />}
            <span className="font-medium text-xs mt-2">{loading ? "Sending" : "Start"}</span>
          </motion.button>
        ) : (
           <motion.button 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={stopRecording}
            className="w-24 h-24 bg-[#EF4444]/5 border-2 border-[#EF4444] rounded-full flex flex-col items-center justify-center text-[#EF4444] transition-all group relative shadow-md"
          >
            <div className="absolute inset-0 rounded-full bg-[#EF4444]/10 animate-ping" />
            <Square className="w-6 h-6 fill-current relative z-10" />
            <span className="font-medium text-xs mt-2 relative z-10">Stop</span>
          </motion.button>
        )}

      </div>

      {/* Transcript Area */}
      <div className="bg-[#F8FAFC] border border-[#E5E7EB] p-5 rounded-2xl min-h-[150px] relative transition-all">
        <div className="flex items-center justify-between mb-3 border-b border-[#E5E7EB] pb-2">
          <div className="flex items-center gap-2">
            {isRecording ? (
              <>
                <div className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
                <span className="text-xs font-semibold text-[#EF4444] uppercase tracking-wider">Listening Live...</span>
              </>
            ) : (
              <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Transcript</span>
            )}
          </div>
          
          {transcript && !isRecording && (
            <button 
              onClick={clearTranscript} 
              className="text-[#94A3B8] hover:text-[#4B5563] transition-colors flex items-center text-xs font-medium"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Clear
            </button>
          )}
        </div>
        
        <p className="text-[#1F2937] text-base leading-relaxed tracking-wide min-h-[80px]">
          {transcript || <span className="text-[#CBD5E1] italic">Press start and begin speaking...</span>}
        </p>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className={`text-center mt-4 text-sm font-medium ${
            statusMessage.includes("success") ? "text-[#22C55E]" : 
            statusMessage.includes("Failed") || statusMessage.includes("No speech") ? "text-[#EF4444]" : 
            "text-[#2563EB]"
          }`}
        >
          {statusMessage}
        </motion.p>
      )}
    </div>
  );
}
