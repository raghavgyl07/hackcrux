"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Mic, Square, Loader2, ArrowLeft, Stethoscope, Table2 } from "lucide-react";
import Link from "next/link";

export default function DoctorAIAssistant() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [liveTranscript, setLiveTranscript] = useState("");

  // Refs to survive across re-renders
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fullTranscriptRef = useRef("");       // accumulates ALL final results
  const isRecordingRef = useRef(false);        // mirrors state for use in callbacks
  const streamRef = useRef<MediaStream | null>(null);

  // ──────────────────────────────────────────────────────
  // START recording + speech recognition
  // ──────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    // Reset everything
    fullTranscriptRef.current = "";
    setLiveTranscript("");
    setSummaryData(null);

    try {
      // 1. Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Setup MediaRecorder (for the audio blob sent to backend)
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;

      // 3. Setup Web Speech API for live transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Your browser does not support speech recognition. Please use Google Chrome or Microsoft Edge.");
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        // Build the full transcript from ALL results (final + interim)
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
        // "no-speech" and "aborted" are recoverable — just let onend restart
      };

      recognition.onend = () => {
        // Chrome stops recognition after ~60s of silence or on network hiccup.
        // Auto-restart if we're still supposed to be recording.
        if (isRecordingRef.current) {
          try {
            recognition.start();
          } catch {
            // already started or disposed — ignore
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;

      // 4. Set state
      isRecordingRef.current = true;
      setIsRecording(true);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  }, []);

  // ──────────────────────────────────────────────────────
  // STOP recording + send to backend
  // ──────────────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    // 1. Flag that we're done (prevents auto-restart of recognition)
    isRecordingRef.current = false;
    setIsRecording(false);

    // 2. Stop speech recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    // 3. Stop MediaRecorder and wait for data
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      // Wrap onstop in a promise so we can await it
      const audioBlob: Blob = await new Promise((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(audioChunksRef.current, { type: "audio/webm" }));
        };
        recorder.stop();
      });

      // 4. Stop mic stream
      streamRef.current?.getTracks().forEach(t => t.stop());

      // 5. Give speech recognition one last moment to finalize
      await new Promise(r => setTimeout(r, 400));

      const finalTranscript = fullTranscriptRef.current.trim();

      if (!finalTranscript) {
        alert("No speech was detected. Please speak clearly and try again.");
        return;
      }

      // 6. Send to backend
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        formData.append("transcript", finalTranscript);

        const res = await fetch("http://localhost:5000/api/ai/whisper", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Server error");
        const data = await res.json();
        setSummaryData(data);
      } catch (error) {
        console.error("AI summarization failed:", error);
        // Fallback: show the raw transcript
        setSummaryData({
          summary: finalTranscript,
          points: [{ topic: "Transcribed Speech", details: finalTranscript }]
        });
      } finally {
        setLoading(false);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-6 md:p-10 relative">
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <Link href="/doctor/dashboard" className="inline-flex items-center text-indigo-400 hover:text-indigo-300 mb-8 transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>
        
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <Mic className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">AI Voice Assistant</h1>
            <p className="text-neutral-400">Record patient consultations to automatically extract key clinical points.</p>
          </div>
        </div>

        {/* Record / Stop Button */}
        <div className="flex justify-center mb-8">
          {!isRecording ? (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startRecording}
              disabled={loading}
              className="w-32 h-32 bg-neutral-900 border-2 border-indigo-500/50 rounded-full flex flex-col items-center justify-center text-indigo-400 hover:bg-indigo-500/10 transition-all group disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-10 h-10 animate-spin" /> : <Mic className="w-10 h-10 mb-2 group-hover:scale-110 transition-transform" />}
              <span className="font-medium text-sm">{loading ? "Processing..." : "Tap to Record"}</span>
            </motion.button>
          ) : (
             <motion.button 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={stopRecording}
              className="w-32 h-32 bg-red-500/10 border-2 border-red-500 rounded-full flex flex-col items-center justify-center text-red-500 transition-all group relative"
            >
              <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
              <Square className="w-8 h-8 mb-2 fill-current relative z-10" />
              <span className="font-medium text-sm relative z-10">Stop Recording</span>
            </motion.button>
          )}
        </div>

        {/* Live Transcript Area — visible while recording OR after recording with text */}
        {(isRecording || liveTranscript) && !summaryData && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-12 max-w-2xl mx-auto">
            <div className="bg-neutral-900 border border-indigo-500/20 p-6 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                {isRecording && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  {isRecording ? "Live Transcription" : "Transcription Complete"}
                </span>
              </div>
              <p className="text-white text-lg leading-relaxed">
                {liveTranscript || <span className="text-neutral-600 italic">Listening... start speaking</span>}
              </p>
            </div>
          </motion.div>
        )}

        {/* Summary Results */}
        {summaryData && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-xl">
             <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
               <Stethoscope className="w-5 h-5 text-indigo-400" />
               <h3 className="text-xl font-bold text-white">Structured Consultation Summary</h3>
             </div>
             
             <p className="text-neutral-300 text-sm mb-6 bg-neutral-950 p-4 rounded-xl border border-neutral-800/50">
               {summaryData.summary}
             </p>
             
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-950 border-y border-neutral-800 text-indigo-300 text-sm font-semibold">
                      <th className="py-3 px-5 flex items-center gap-2"><Table2 className="w-4 h-4" /> Discussion Topic</th>
                      <th className="py-3 px-5">Extracted Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50 text-sm">
                    {summaryData.points?.map((pt: any, idx: number) => (
                      <tr key={idx} className="hover:bg-neutral-800/20 transition-colors">
                        <td className="py-4 px-5 text-neutral-300 font-medium w-1/3">{pt.topic}</td>
                        <td className="py-4 px-5 text-white">{pt.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
