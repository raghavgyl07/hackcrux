"use client";

import React, { useState, useRef, useCallback } from "react";
import { Mic, Square, Loader2, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

export default function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

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
      recognition.lang = "en-US";

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
  }, [transcript]);

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
      const response = await fetch("/api/process-transcript", {
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
    <div className="w-full max-w-2xl mx-auto bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl">
      <div className="flex flex-col items-center mb-8">
        
        {/* Record / Stop Button */}
        {!isRecording ? (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startRecording}
            disabled={loading}
            className="w-24 h-24 bg-neutral-950 border-2 border-indigo-500/50 rounded-full flex flex-col items-center justify-center text-indigo-400 hover:bg-indigo-500/10 transition-all group disabled:opacity-50"
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
            className="w-24 h-24 bg-red-500/10 border-2 border-red-500 rounded-full flex flex-col items-center justify-center text-red-500 transition-all group relative"
          >
            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
            <Square className="w-6 h-6 fill-current relative z-10" />
            <span className="font-medium text-xs mt-2 relative z-10">Stop</span>
          </motion.button>
        )}

      </div>

      {/* Transcript Area */}
      <div className="bg-neutral-950 border border-neutral-800 p-5 rounded-2xl min-h-[150px] relative transition-all">
        <div className="flex items-center justify-between mb-3 border-b border-neutral-800 pb-2">
          <div className="flex items-center gap-2">
            {isRecording ? (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Listening Live...</span>
              </>
            ) : (
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Transcript</span>
            )}
          </div>
          
          {transcript && !isRecording && (
            <button 
              onClick={clearTranscript} 
              className="text-neutral-500 hover:text-neutral-300 transition-colors flex items-center text-xs font-medium"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Clear
            </button>
          )}
        </div>
        
        <p className="text-white text-base leading-relaxed tracking-wide min-h-[80px]">
          {transcript || <span className="text-neutral-600 italic">Press start and begin speaking...</span>}
        </p>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className={`text-center mt-4 text-sm font-medium ${
            statusMessage.includes("success") ? "text-green-400" : 
            statusMessage.includes("Failed") || statusMessage.includes("No speech") ? "text-red-400" : 
            "text-indigo-400"
          }`}
        >
          {statusMessage}
        </motion.p>
      )}
    </div>
  );
}
