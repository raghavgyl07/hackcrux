"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, FileText, Calendar, ArrowRight, ArrowLeft, Stethoscope, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { API_BASE_URL } from "@/lib/api";

interface Report {
  id: string; // from report_id
  priority_level: string;
  priority_score: number;
  report_date: string;
  predicted_department: string;
  image_url: string | null;
}

function PatientReportsContent() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "patient@example.com";

  useEffect(() => {
    fetchReports();
  }, [email]);

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/patient/reports?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        setReports(await res.json());
      }
    } catch (e) {
      console.error("List fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "CRITICAL": return "bg-red-500 text-white";
      case "HIGH": return "bg-orange-500 text-white";
      case "MEDIUM": return "bg-blue-500 text-white";
      case "LOW": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-3 border-[var(--primary-gradient-start)]/30 border-t-[var(--primary-gradient-start)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10 relative bg-[var(--background)] font-[family-name:var(--font-inter)] text-[var(--foreground)] overflow-hidden">
      <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] bg-[var(--primary-gradient-end)]/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pt-4">
          <div>
            <Link href={`/patient/submit?email=${encodeURIComponent(email)}`} className="inline-flex items-center text-[var(--secondary)] hover:text-[var(--primary-gradient-start)] mb-6 transition-colors text-sm font-medium border hover:border-[var(--primary-gradient-start)]/30 px-3 py-1.5 rounded-full">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Symptom Assessment
            </Link>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--primary-gradient-start)]/10 to-[var(--primary-gradient-end)]/10 border border-[var(--primary-gradient-start)]/20 flex items-center justify-center shadow-sm">
                <FileText className="w-6 h-6 text-[var(--primary-gradient-start)]" />
              </div>
              <h1 className="text-4xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)] tracking-tight">My Medical Reports</h1>
            </div>
            <p className="text-[var(--secondary)]">View your history, priority status, and doctor comments.</p>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--background)]/50 border-b border-[var(--border-color)] text-[var(--secondary)] text-sm">
                  <th className="py-5 px-6 font-semibold">Date</th>
                  <th className="py-5 px-6 font-semibold">Report ID</th>
                  <th className="py-5 px-6 font-semibold">Department</th>
                  <th className="py-5 px-6 font-semibold">Priority Level</th>
                  <th className="py-5 px-6 font-semibold">Triage Level</th>
                  <th className="py-5 px-6 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-sm">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-[var(--secondary)]">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="w-12 h-12 text-[var(--secondary)]/30 mb-4" />
                        <p className="text-lg font-[family-name:var(--font-dm-serif)] text-[var(--foreground)]">No reports found</p>
                        <p className="text-sm mt-1">Submit your symptoms to receive an AI triage report.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--background)]/50 transition-colors">
                      <td className="py-5 px-6 text-[var(--secondary)]">
                        <div className="flex items-center gap-2">
                           <Calendar className="w-4 h-4 text-[var(--secondary)]/70" /> {new Date(r.report_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-5 px-6 text-[var(--foreground)] font-mono text-xs flex items-center gap-2 mt-0.5">
                        {r.id.substring(0, 8)}...
                        {r.image_url && <span title="Contains image"><ImageIcon className="w-3.5 h-3.5 text-[var(--primary-gradient-start)]" /></span>}
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-[var(--primary-gradient-end)]" />
                          <span className="text-[var(--foreground)] font-medium">{r.predicted_department || 'General Medicine'}</span>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${getPriorityColor(r.priority_level)} shadow-sm`}>
                          {r.priority_level}
                        </span>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-2">
                           <Activity className="w-4 h-4 text-[var(--primary-gradient-start)]" />
                           <span className="text-[var(--foreground)] font-mono font-semibold">{r.priority_score?.toFixed(1) || '0.0'} / 4</span>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <Link 
                          href={`/patient/report/${r.id}`}
                          className="inline-flex items-center justify-center text-[var(--primary-gradient-start)] hover:text-[var(--primary-gradient-end)] hover:bg-[var(--primary-gradient-start)]/5 py-2 px-3 rounded-xl transition-all font-medium text-xs group"
                        >
                          View Report <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function PatientReports() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-3 border-[var(--primary-gradient-start)]/30 border-t-[var(--primary-gradient-start)] rounded-full animate-spin" />
      </div>
    }>
      <PatientReportsContent />
    </Suspense>
  );
}
