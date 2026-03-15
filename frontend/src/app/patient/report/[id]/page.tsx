"use client";

import { useEffect, useState, use } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, User, FileText, AlertTriangle, CheckCircle, Clock, Stethoscope, Activity, Image as ImageIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PatientReportView({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      // Re-using doctor's get route here for reading. Or creating a generic one.
      const res = await fetch(`${API_BASE_URL}/api/doctor/report/${id}`);
      if (res.ok) {
        setReport(await res.json());
      } else {
        alert("Report not found");
        router.push("/patient/reports");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen p-6 md:p-10 relative bg-[var(--background)] font-[family-name:var(--font-inter)] text-[var(--foreground)] overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-10 right-[-10%] w-[350px] h-[350px] bg-[var(--primary-gradient-end)]/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-[-10%] w-[350px] h-[350px] bg-[var(--primary-gradient-start)]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 pt-4">
        <Link href={`/patient/reports?email=${encodeURIComponent(report.patient_email)}`} className="inline-flex items-center text-[var(--secondary)] hover:text-[var(--primary-gradient-start)] mb-8 transition-colors text-sm font-medium border hover:border-[var(--primary-gradient-start)]/30 px-3 py-1.5 rounded-full bg-[var(--card-bg)] shadow-sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to My Reports
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)] mb-3 flex items-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary-gradient-start)]/10 to-[var(--primary-gradient-end)]/10 border border-[var(--primary-gradient-start)]/20 flex items-center justify-center mr-4 shadow-sm">
                <FileText className="w-6 h-6 text-[var(--primary-gradient-start)]" />
              </div>
              Triage Report Summary
            </h1>
            <p className="text-[var(--secondary)] font-mono text-sm pl-16">Report ID: {report.report_id}</p>
          </div>
          
          <div className={`px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm ${getPriorityStyle(report.priority_level)}`}>
            <AlertCircle className="w-4 h-4" />
            <span className="font-semibold tracking-wide text-sm uppercase">{report.priority_level} Priority ({report.priority_score.toFixed(1)}/4)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-7 shadow-sm">
            <h3 className="text-xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)] mb-5 border-b border-[var(--border-color)] pb-3 flex items-center">
               <User className="w-5 h-5 text-[var(--primary-gradient-start)] mr-2" /> Patient Information
            </h3>
            <div className="space-y-4 text-sm font-medium">
              <div className="flex items-center gap-3 p-2 hover:bg-[var(--background)]/50 rounded-lg transition-colors">
                <User className="w-4 h-4 text-[var(--secondary)]/60" />
                <span className="text-[var(--secondary)] w-20">Name:</span>
                <span className="text-[var(--foreground)]">{report.patient_name}</span>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-[var(--background)]/50 rounded-lg transition-colors">
                <Activity className="w-4 h-4 text-[var(--secondary)]/60" />
                <span className="text-[var(--secondary)] w-20">Age:</span>
                <span className="text-[var(--foreground)]">{report.age}</span>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-[var(--background)]/50 rounded-lg transition-colors">
                <Calendar className="w-4 h-4 text-[var(--secondary)]/60" />
                <span className="text-[var(--secondary)] w-20">Date:</span>
                <span className="text-[var(--foreground)]">{new Date(report.report_date).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-[var(--background)]/50 rounded-lg transition-colors">
                <Stethoscope className="w-4 h-4 text-[var(--secondary)]/60" />
                <span className="text-[var(--secondary)] w-20">Dept:</span>
                <span className="text-[var(--primary-gradient-end)] font-bold bg-[var(--primary-gradient-end)]/10 px-2 py-0.5 rounded-md">{report.predicted_department || 'General Medicine'}</span>
              </div>
            </div>
          </motion.div>

          {report.image_url && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm">
              <img 
                src={`${API_BASE_URL}${report.image_url}`} 
                alt="Clinical Image" 
                className="w-full h-48 object-cover rounded-xl border border-[var(--border-color)] shadow-sm"
              />
              <div className="mt-5 px-2">
                <p className="text-xs text-[var(--secondary)] uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[var(--primary-gradient-start)]" /> Visual Findings
                </p>
                <div className="flex flex-wrap gap-2">
                  {JSON.parse(report.visual_findings || "[]").map((f: string) => (
                    <span key={f} className="text-[11px] font-semibold bg-[var(--primary-gradient-start)]/10 text-[var(--primary-gradient-start)] border border-[var(--primary-gradient-start)]/20 px-2.5 py-1 rounded-full">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: report.image_url ? 0.2 : 0.1 }} className={`bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-7 shadow-sm ${!report.image_url ? 'md:col-span-2' : ''}`}>
            <h3 className="text-xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)] mb-5 border-b border-[var(--border-color)] pb-3 flex items-center">
               <Activity className="w-5 h-5 text-[var(--primary-gradient-start)] mr-2" /> AI Clinical Assessment
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-[11px] text-[var(--secondary)] uppercase font-bold tracking-widest mb-2 flex items-center"><FileText className="w-3 h-3 mr-1.5 opacity-70" /> Clinical Summary</p>
                <p className="text-[var(--foreground)] leading-relaxed text-sm bg-[var(--background)]/50 p-4 rounded-xl border border-[var(--border-color)]">{report.ai_summary}</p>
              </div>
              {report.ai_reason && (
                <div>
                  <p className="text-[11px] text-[var(--secondary)] uppercase font-bold tracking-widest mb-2 flex items-center"><Stethoscope className="w-3 h-3 mr-1.5 opacity-70" /> Triage Reasoning</p>
                  <p className="text-[var(--foreground)] font-medium leading-relaxed text-sm bg-gradient-to-r from-[var(--primary-gradient-start)]/5 to-[var(--primary-gradient-end)]/5 border border-[var(--primary-gradient-start)]/10 p-4 rounded-xl italic relative">
                    <span className="absolute top-2 left-2 text-4xl text-[var(--primary-gradient-start)]/10 font-serif leading-none">"</span>
                    <span className="relative z-10">{report.ai_reason}</span>
                  </p>
                </div>
              )}
              {report.risk_indicators && (
                <div>
                  <p className="text-[11px] text-[var(--emergency-red)] uppercase font-bold tracking-widest mb-3 flex items-center"><AlertCircle className="w-3 h-3 mr-1.5 opacity-70" /> Identified Risk Indicators</p>
                  <div className="flex flex-wrap gap-2.5">
                    {JSON.parse(report.risk_indicators || "[]").map((r: string) => (
                      <span key={r} className="text-xs font-semibold bg-[var(--emergency-red)]/5 text-[var(--emergency-red)] border border-[var(--emergency-red)]/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-7 shadow-sm mb-10">
          <h3 className="text-xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)] mb-5 border-b border-[var(--border-color)] pb-3 flex items-center">
            <Stethoscope className="w-5 h-5 text-[var(--primary-gradient-start)] mr-2" /> Doctor's Response & Finalization
          </h3>
          
          {report.doctor_response ? (
            <div className="bg-[var(--success-green)]/5 border border-[var(--success-green)]/10 text-[var(--success-green)] p-5 rounded-xl flex gap-4 text-sm shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--success-green)]/5 rounded-full blur-2xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
              <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-0.5 relative z-10" />
              <div className="relative z-10">
                <p className="font-bold mb-1.5 text-[15px] tracking-tight">Report Evaluated</p>
                <p className="text-[var(--foreground)]/90 leading-relaxed font-medium">{report.doctor_response}</p>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--background)]/50 border border-[var(--border-color)] p-8 rounded-xl flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 bg-white border border-[var(--border-color)] shadow-sm rounded-full flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-[var(--secondary)]/50 animate-pulse" />
              </div>
              <span className="text-[var(--foreground)] text-sm font-semibold tracking-wide">Under Review</span>
              <p className="text-[var(--secondary)] text-sm mt-2 max-w-sm">Your doctor has not yet provided a response to this submission. Please check back later.</p>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
