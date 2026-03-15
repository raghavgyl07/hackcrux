"use client";

<<<<<<< HEAD
import { useEffect, useState, use } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, User, Mail, Calendar, Activity, CheckCircle2, FileText, AlertCircle, Stethoscope } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MicInput from "@/components/MicInput";

export default function DoctorReportView({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [report, setReport] = useState<any>(null);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/doctor/report/${id}`);
      if (res.ok) {
        setReport(await res.json());
      } else {
        alert("Report not found");
        router.push("/doctor/dashboard");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTranslateBlur = async () => {
    if (!response.trim()) return;

    // Quick skip if likely already English
    const nonAsciiRatio = (response.replace(/[\x00-\x7F]/g, '').length) / response.length;
    if (nonAsciiRatio < 0.1) return;

    setIsTranslating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/translate-to-english`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: response }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translated && data.translated !== response) {
          setResponse(data.translated);
        }
      }
    } catch (err) {
      console.error("Translation failed:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleFinalize = async () => {
    if (!response.trim()) return alert("Please enter a doctor response");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/doctor/report/${id}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_response: response })
      });
      if (res.ok) {
        alert("Report finalized.");
        router.push("/doctor/dashboard");
      } else {
        alert("Failed to finalize report.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-8 h-8 border-3 border-[var(--primary-gradient-start)]/30 border-t-[var(--primary-gradient-start)] rounded-full animate-spin" />
    </div>
  );
  if (!report) return null;

  const getPriorityStyle = (level: string) => {
    switch (level?.toUpperCase()) {
      case "CRITICAL": return "bg-[var(--emergency-red)] text-white shadow-[var(--emergency-red)]/20";
      case "HIGH": return "bg-[#F97316] text-white shadow-[#F97316]/20"; // Orange
      case "MEDIUM": return "bg-[var(--warning-yellow)] text-white shadow-[var(--warning-yellow)]/20";
      case "LOW": return "bg-[var(--success-green)] text-white shadow-[var(--success-green)]/20";
      default: return "bg-[var(--secondary)] text-white shadow-md";
    }
  };
=======
import { Suspense } from "react";
import PatientReportsContent from "./PatientReportsContent";
>>>>>>> 40c1ef9d6ba5200e971500088713161ed4ce978b

export default function Page() {
  return (
<<<<<<< HEAD
    <div className="min-h-screen p-6 md:p-10 relative bg-[var(--background)] font-[family-name:var(--font-inter)] text-[var(--foreground)] overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-10 right-[-10%] w-[400px] h-[400px] bg-[var(--primary-gradient-end)]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-[-10%] w-[400px] h-[400px] bg-[var(--primary-gradient-start)]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 pt-4">
        <Link href="/doctor/dashboard" className="inline-flex items-center text-[var(--secondary)] hover:text-[var(--primary-gradient-start)] mb-8 transition-colors text-sm font-medium border hover:border-[var(--primary-gradient-start)]/30 px-3 py-1.5 rounded-full bg-[var(--card-bg)] shadow-sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div>
             <h1 className="text-4xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)] mb-3 flex items-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary-gradient-start)]/10 to-[var(--primary-gradient-end)]/10 border border-[var(--primary-gradient-start)]/20 flex items-center justify-center mr-4 shadow-sm">
                <FileText className="w-6 h-6 text-[var(--primary-gradient-start)]" />
              </div>
              Report Details
            </h1>
            <p className="text-[var(--secondary)] font-mono text-sm pl-16">Report ID: {report.report_id}</p>
          </div>
          
          <div className={`px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm ${getPriorityStyle(report.priority_level)}`}>
            <AlertCircle className="w-4 h-4" />
            <span className="font-semibold tracking-wide text-sm uppercase">{report.priority_level} Priority ({report.priority_score.toFixed(1)}/4)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-7 shadow-sm md:col-span-1">
            <h3 className="text-xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)] mb-5 border-b border-[var(--border-color)] pb-3 flex items-center">
               <User className="w-5 h-5 text-[var(--primary-gradient-start)] mr-2" /> Patient Info
            </h3>
            <div className="space-y-4 text-sm font-medium">
              <div className="flex items-center gap-3 p-2 hover:bg-[var(--background)]/50 rounded-lg transition-colors">
                <User className="w-4 h-4 text-[var(--secondary)]/60" />
                <span className="text-[var(--secondary)] w-16">Name:</span>
                <span className="text-[var(--foreground)] truncate">{report.patient_name}</span>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-[var(--background)]/50 rounded-lg transition-colors">
                <Mail className="w-4 h-4 text-[var(--secondary)]/60" />
                <span className="text-[var(--secondary)] w-16">Email:</span>
                <span className="text-[var(--foreground)] truncate" title={report.patient_email}>{report.patient_email}</span>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-[var(--background)]/50 rounded-lg transition-colors">
                <Activity className="w-4 h-4 text-[var(--secondary)]/60" />
                <span className="text-[var(--secondary)] w-16">Age:</span>
                <span className="text-[var(--foreground)]">{report.age} yrs</span>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-[var(--background)]/50 rounded-lg transition-colors border-t border-[var(--border-color)]/50 pt-3 mt-1">
                <Calendar className="w-4 h-4 text-[var(--secondary)]/60" />
                <span className="text-[var(--foreground)] text-xs">{new Date(report.report_date).toLocaleString()}</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-7 shadow-sm ${report.image_url ? 'md:col-span-2' : 'md:col-span-2'}`}>
            <h3 className="text-xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)] mb-5 border-b border-[var(--border-color)] pb-3 flex items-center">
               <Activity className="w-5 h-5 text-[var(--primary-gradient-start)] mr-2" /> AI Clinical Assessment
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <p className="text-[11px] text-[var(--secondary)] uppercase font-bold tracking-widest mb-2 flex items-center"><FileText className="w-3 h-3 mr-1.5 opacity-70" /> Symptom Summary</p>
                   <p className="text-[var(--foreground)] leading-relaxed text-sm bg-[var(--background)]/50 p-4 rounded-xl border border-[var(--border-color)]">{report.ai_summary}</p>
                </div>
                 {report.ai_reason && (
                  <div>
                    <p className="text-[11px] text-[var(--secondary)] uppercase font-bold tracking-widest mb-2 flex items-center"><Stethoscope className="w-3 h-3 mr-1.5 opacity-70" /> Triage Reasoning</p>
                    <p className="text-[var(--foreground)] font-medium leading-relaxed text-sm bg-gradient-to-r from-[var(--primary-gradient-start)]/5 to-[var(--primary-gradient-end)]/5 border border-[var(--primary-gradient-start)]/10 p-4 rounded-xl italic relative h-full">
                      <span className="absolute top-2 left-2 text-4xl text-[var(--primary-gradient-start)]/10 font-serif leading-none">"</span>
                      <span className="relative z-10">{report.ai_reason}</span>
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col md:flex-row gap-6">
               {report.risk_indicators && (
                  <div className="flex-1">
                    <p className="text-[11px] text-[var(--emergency-red)] uppercase font-bold tracking-widest mb-3 flex items-center"><AlertCircle className="w-3 h-3 mr-1.5 opacity-70" /> High Risk Indicators</p>
                    <div className="flex flex-wrap gap-2.5">
                      {JSON.parse(report.risk_indicators || "[]").map((r: string) => (
                        <span key={r} className="text-xs font-semibold bg-[var(--emergency-red)]/5 text-[var(--emergency-red)] border border-[var(--emergency-red)]/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                          <AlertCircle className="w-3.5 h-3.5" /> {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {report.image_url && (
                    <div className="flex-1 border-t md:border-t-0 md:border-l border-[var(--border-color)] pt-5 md:pt-0 md:pl-5">
                       <p className="text-[11px] text-[var(--secondary)] uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-[var(--primary-gradient-start)]" /> Visual Findings
                      </p>
                      <img 
                        src={`${API_BASE_URL}${report.image_url}`} 
                        alt="Patient Image" 
                        className="w-full h-32 object-cover rounded-xl border border-[var(--border-color)] shadow-sm mb-3"
                      />
                      <div className="flex flex-wrap gap-2">
                        {JSON.parse(report.visual_findings || "[]").map((f: string) => (
                           <span key={f} className="text-[11px] font-semibold bg-[var(--primary-gradient-start)]/10 text-[var(--primary-gradient-start)] border border-[var(--primary-gradient-start)]/20 px-2.5 py-1 rounded-full">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-7 shadow-sm mb-10 overflow-hidden relative">
           <div className="absolute right-0 top-0 w-64 h-64 bg-[var(--primary-gradient-start)]/5 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2" />
           
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 border-b border-[var(--border-color)] pb-4 relative z-10 gap-4">
             <h3 className="text-xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)] flex items-center">
              <Stethoscope className="w-5 h-5 text-[var(--primary-gradient-start)] mr-2" /> Doctor's Response & Finalization
              {isTranslating && <span className="ml-4 text-xs bg-[var(--primary-gradient-start)]/10 text-[var(--primary-gradient-start)] px-3 py-1 rounded-full font-bold uppercase tracking-wider animate-pulse flex items-center gap-1.5"><Activity className="w-3 h-3" /> Translating...</span>}
            </h3>
            {!report.doctor_response && (
               <MicInput onTranscript={(text) => setResponse(prev => prev ? prev + " " + text : text)} />
            )}
          </div>
          
          <div className="relative z-10">
            {report.doctor_response ? (
               <div className="bg-[var(--success-green)]/5 border border-[var(--success-green)]/10 text-[var(--success-green)] p-5 rounded-xl flex gap-4 text-sm shadow-sm">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1.5 text-[15px] tracking-tight">Report Already Finalized</p>
                  <p className="text-[var(--foreground)]/90 leading-relaxed font-medium">{report.doctor_response}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  onBlur={handleTranslateBlur}
                  rows={6}
                   className="w-full bg-[var(--background)]/50 border border-[var(--border-color)] rounded-xl py-4 px-5 text-[var(--foreground)] placeholder-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-gradient-start)]/30 focus:border-[var(--primary-gradient-start)]/50 transition-all resize-none shadow-sm text-sm"
                  placeholder="Enter clinical assessment, prescription notes, and prescribed actions for the patient..."
                ></textarea>
                <div className="flex justify-end">
                  <button
                    onClick={handleFinalize}
                    disabled={saving || isTranslating || !response.trim()}
                    className="bg-gradient-to-r from-[var(--primary-gradient-start)] to-[var(--primary-gradient-end)] hover:shadow-[0_4px_14px_0_rgba(236,72,153,0.39)] text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {saving ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Saving...</>
                    ) : isTranslating ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Translating...</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4 mr-2" /> Finalize Report</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
=======
    <Suspense fallback={<div>Loading...</div>}>
      <PatientReportsContent />
    </Suspense>
>>>>>>> 40c1ef9d6ba5200e971500088713161ed4ce978b
  );
}