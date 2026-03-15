import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Globe, Loader2 } from 'lucide-react';

const LANGUAGES = [
  { code: "", label: "Auto" },
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

interface MicInputProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export default function MicInput({ onTranscript, className = "" }: MicInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedLang, setSelectedLang] = useState("");
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const selectedLangRef = useRef("");
  const accumulatedTextRef = useRef("");

  useEffect(() => {
    selectedLangRef.current = selectedLang;
  }, [selectedLang]);

  // Translate text to English via backend
  const translateToEnglish = async (text: string): Promise<string> => {
    try {
      const res = await fetch("http://localhost:5000/api/ai/translate-to-english", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return text;
      const data = await res.json();
      return data.translated || text;
    } catch {
      return text;
    }
  };

  const buildRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    if (selectedLangRef.current) {
      recognition.lang = selectedLangRef.current;
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        }
      }
      if (finalTranscript.trim()) {
        accumulatedTextRef.current += finalTranscript;
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        setIsRecording(false);
        isRecordingRef.current = false;
      }
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    return recognition;
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support speech recognition. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    accumulatedTextRef.current = "";
    const recognition = buildRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;
    isRecordingRef.current = true;
    setIsRecording(true);
    try { recognition.start(); } catch {}
  }, [buildRecognition]);

  const stopRecording = useCallback(async () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    const rawText = accumulatedTextRef.current.trim();
    if (!rawText) return;

    // Translate to English, then pass to parent
    setIsTranslating(true);
    try {
      const englishText = await translateToEnglish(rawText);
      onTranscript(englishText + " ");
    } finally {
      setIsTranslating(false);
    }
  }, [onTranscript]);

  const toggleRecording = useCallback(() => {
    if (isRecordingRef.current) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [startRecording, stopRecording]);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Language selector */}
      <div className="flex items-center gap-1">
        <Globe className="w-3.5 h-3.5 text-[#94A3B8]" />
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          disabled={isRecording || isTranslating}
          className="bg-white border border-[#E5E7EB] text-[#4B5563] text-xs rounded-lg px-1.5 py-1 focus:outline-none focus:border-[#2563EB] disabled:opacity-50 cursor-pointer"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>{lang.label}</option>
          ))}
        </select>
      </div>

      {/* Mic / Stop / Translating button */}
      {isTranslating ? (
        <div
          className="p-3 bg-[#14B8A6]/10 text-[#14B8A6] rounded-full border border-[#14B8A6]/30 shadow-sm"
          title="Translating to English..."
        >
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : !isRecording ? (
        <button 
          type="button"
          onClick={toggleRecording}
          title="Dictate (auto-translates to English)" 
          className="p-3 bg-[var(--primary-gradient-start)]/10 hover:bg-[var(--primary-gradient-start)]/20 text-[var(--primary-gradient-start)] rounded-full transition-all border border-[var(--primary-gradient-start)]/20 shadow-sm transform hover:scale-105"
        >
          <Mic className="w-5 h-5" />
        </button>
      ) : (
        <button 
          type="button"
          onClick={toggleRecording} 
          title="Stop Recording"
          className="p-3 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] rounded-full transition-all border border-[#EF4444]/30 animate-pulse shadow-sm relative"
        >
          <div className="absolute inset-0 rounded-full bg-[#EF4444]/10 animate-ping" />
          <Square className="w-5 h-5 fill-current relative z-10" />
        </button>
      )}
    </div>
  );
}
