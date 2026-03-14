import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

interface MicInputProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export default function MicInput({ onTranscript, className = "" }: MicInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);

  // Initialize Speech Recognition once
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          }
        }
        
        if (finalTranscript.trim()) {
          onTranscript(finalTranscript.trim() + " ");
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
        // Auto-restart if we're still actively recording (handles Chrome's 1-min timeout)
        if (isRecordingRef.current) {
          try {
            recognition.start();
          } catch {
            // Already started or disposed
          }
        } else {
          setIsRecording(false);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [onTranscript]);

  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) {
      alert("Your browser does not support speech recognition. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    if (isRecordingRef.current) {
      // Stop recording
      isRecordingRef.current = false;
      setIsRecording(false);
      try { recognitionRef.current.stop(); } catch {}
    } else {
      // Start recording
      isRecordingRef.current = true;
      setIsRecording(true);
      try { recognitionRef.current.start(); } catch {}
    }
  }, []);

  return (
    <div className={`inline-block ${className}`}>
      {!isRecording ? (
        <button 
          type="button"
          onClick={toggleRecording}
          title="Dictate with AI" 
          className="p-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-full transition-all border border-indigo-500/30 shadow-md transform hover:scale-105"
        >
          <Mic className="w-5 h-5" />
        </button>
      ) : (
        <button 
          type="button"
          onClick={toggleRecording} 
          title="Stop Recording"
          className="p-3 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-full transition-all border border-red-500/50 animate-pulse shadow-md relative"
        >
          <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
          <Square className="w-5 h-5 fill-current relative z-10" />
        </button>
      )}
    </div>
  );
}
