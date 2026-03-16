"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Send, Activity, UserCircle, FileText, ImageIcon, X, AlertTriangle, Languages, ShieldCheck, Stethoscope, CheckCircle2, Mail, Calendar, Upload } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import MicInput from "@/components/MicInput";

function PatientSubmitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(searchParams.get("name") || "");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [age, setAge] = useState("25");
  const [duration, setDuration] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [translatingFields, setTranslatingFields] = useState<{ [key: string]: boolean }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.name && !name) setName(user.name);
    if (!email) {
       const currentEmail = searchParams.get("email");
       if (currentEmail && currentEmail !== "patient@example.com") {
         setEmail(currentEmail);
       } else if (user.email) {
         setEmail(user.email);
       }
    }
  }, [searchParams, name, email]);

  const translateToEnglish = async (text: string, field: string) => {
    if (!text.trim()) return;
    setTranslatingFields(prev => ({ ...prev, [field]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/translate-to-english`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translated) {
          if (field === 'name') setName(data.translated);
          if (field === 'duration') setDuration(data.translated);
          if (field === 'symptoms') setSymptoms(data.translated);
        }
      }
    } catch (e) {
      console.error("Translation error:", e);
    } finally {
      setTranslatingFields(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", name);
      formDataToSend.append("email", email);
      formDataToSend.append("age", age);
      const combinedSymptoms = duration ? `Duration: ${duration}. Symptoms: ${symptoms}` : symptoms;
      formDataToSend.append("symptoms", combinedSymptoms);
      if (image) {
        formDataToSend.append("image", image);
      }

      const response = await fetch(`${API_BASE_URL}/api/patient/submit`, {
        method: "POST",
        body: formDataToSend
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/patient/report/${result.reportId}`);
      } else {
        alert("Something went wrong while submitting.");
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 relative overflow-hidden bg-[var(--background)] font-[family-name:var(--font-inter)] text-[var(--foreground)]">
      <div className="absolute top-10 right-[-10%] w-[400px] h-[400px] bg-[var(--primary-gradient-end)]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-[-10%] w-[300px] h-[300px] bg-[var(--primary-gradient-start)]/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-3xl mx-auto relative z-10 pt-4">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => router.push("/")} className="flex items-center text-[var(--secondary)] hover:text-[var(--primary-gradient-start)] transition-colors font-medium text-sm border hover:border-[var(--primary-gradient-start)]/30 px-3 py-1.5 rounded-full">
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </button>
          <Link href={`/patient/reports?email=${encodeURIComponent(email)}`} className="flex items-center text-[var(--primary-gradient-start)] hover:text-[var(--primary-gradient-end)] transition-colors font-medium text-sm border border-[var(--primary-gradient-start)]/20 hover:border-[var(--primary-gradient-start)]/40 px-3 py-1.5 rounded-full bg-[var(--primary-gradient-start)]/5">
            <FileText className="w-4 h-4 mr-2" /> View My Reports
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10 mt-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary-gradient-start)]/10 to-[var(--primary-gradient-end)]/10 border border-[var(--primary-gradient-start)]/20 mb-6 shadow-sm">
            <Activity className="w-8 h-8 text-[var(--primary-gradient-start)]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)] mb-4 tracking-tight">Symptom Assessment</h1>
          <p className="text-[var(--secondary)] text-lg max-w-xl mx-auto">Please provide your details and describe your symptoms. Our AI will analyze the severity and triage you accordingly.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <h3 className="text-[var(--foreground)] font-[family-name:var(--font-dm-serif)] text-xl mb-4 border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                 <UserCircle className="w-5 h-5 text-[var(--primary-gradient-start)]"/> Patient Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary)] mb-2">Patient Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary-gradient-start)]/20 outline-none" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary)] mb-2">Age</label>
                  <input type="number" required value={age} onChange={(e) => setAge(e.target.value)} className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary-gradient-start)]/20 outline-none" placeholder="e.g. 45" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[var(--foreground)] font-[family-name:var(--font-dm-serif)] text-xl mb-4 border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                 <Activity className="w-5 h-5 text-[var(--primary-gradient-start)]"/> Medical Information
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary)] mb-2 uppercase tracking-wider text-[10px]">Duration</label>
                  <input type="text" required value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-[var(--foreground)] outline-none" placeholder="e.g. 2 days" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-[var(--secondary)]">Symptoms</label>
                    <MicInput onTranscript={(text) => setSymptoms(prev => prev ? prev + " " + text : text)} />
                  </div>
                  <textarea required rows={5} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-[var(--foreground)] resize-none outline-none" placeholder="Describe what you are feeling..." />
                </div>
              </div>
            </div>

            <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-2xl p-6">
              <label className="block text-sm font-medium text-[var(--secondary)] mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-[var(--primary-gradient-start)]" /> Upload Image (Optional)</label>
              {!preview ? (
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-[var(--card-bg)]">
                  <ImageIcon className="w-10 h-10 text-[var(--secondary)]/40 mb-2" />
                  <p className="text-[var(--secondary)] text-sm font-medium text-center">Click to upload clinical photo</p>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-[var(--border-color)]">
                  <img src={preview} alt="Preview" className="w-full max-h-64 object-contain" />
                  <button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg"><X className="w-4 h-4" /></button>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
            </div>

            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex gap-3 text-xs text-blue-700 italic">
              <AlertTriangle className="w-4 h-4 text-blue-500 flex-shrink-0" />
              Disclaimer: AI analysis is an assistive triage tool and not a replacement for professional diagnosis.
            </div>

            <button type="submit" disabled={loading} className="w-full text-white font-bold text-lg flex items-center justify-center py-4 rounded-xl shadow-md bg-gradient-to-r from-[var(--primary-gradient-start)] to-[var(--primary-gradient-end)] active:scale-95 transition-all text-sm uppercase tracking-widest">
              {loading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : "Submit Symptoms"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default function PatientSubmit() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-3 border-[var(--primary-gradient-start)]/30 border-t-[var(--primary-gradient-start)] rounded-full animate-spin" />
      </div>
    }>
      <PatientSubmitContent />
    </Suspense>
  );
}
