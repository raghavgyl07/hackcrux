"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, FileText, ArrowLeft, Calendar, User, Activity } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

interface Report {
  report_id: string;
  patient_id: string;
  patient_name: string;
  priority_level: string;
  priority_score: number;
  report_date: string;
}

export default function DoctorAllReports() {
  const router = useRouter();
  const [patients, setPatients] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.email || user.role !== "Doctor") {
      router.push("/login");
      return;
    }
    setDepartment(user.department);
    fetchReports(user.department);
  }, []);

  const fetchReports = async (dept: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/doctor/reports?department=${encodeURIComponent(dept || department)}`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "CRITICAL": return "bg-[var(--emergency-red)] text-white shadow-[var(--emergency-red)]/20";
      case "HIGH": return "bg-[#F97316] text-white shadow-[#F97316]/20";
      case "MEDIUM": return "bg-[var(--warning-yellow)] text-white shadow-[var(--warning-yellow)]/20";
      case "LOW": return "bg-[var(--success-green)] text-white shadow-[var(--success-green)]/20";
      default: return "bg-[var(--secondary)] text-white shadow-md";
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
      {/* Decorative gradients */}
      <div className="absolute top-10 right-[-10%] w-[500px] h-[500px] bg-[var(--primary-gradient-end)]/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10 pt-4">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <Link href="/doctor/dashboard" className="inline-flex items-center text-[var(--secondary)] hover:text-[var(--primary-gradient-start)] mb-6 transition-colors text-sm font-medium border hover:border-[var(--primary-gradient-start)]/30 px-3 py-1.5 rounded-full bg-[var(--card-bg)] shadow-sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--primary-gradient-start)]/10 to-[var(--primary-gradient-end)]/10 border border-[var(--primary-gradient-start)]/20 flex items-center justify-center shadow-sm">
                <FileText className="w-6 h-6 text-[var(--primary-gradient-start)]" />
              </div>
              <h1 className="text-4xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)] tracking-tight">All Reports</h1>
            </div>
            <p className="text-[var(--secondary)] pl-16">Master view of historical triage records for {department} department</p>
          </div>
        </header>

        {/* Priority List Table */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--background)]/30 border-b border-[var(--border-color)] text-[var(--secondary)] text-sm">
                  <th className="py-5 px-6 font-semibold">Date</th>
                  <th className="py-5 px-6 font-semibold">Patient Details</th>
                  <th className="py-5 px-6 font-semibold">Status Level</th>
                  <th className="py-5 px-6 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-sm">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-[var(--secondary)]">
                       <div className="flex flex-col items-center justify-center">
                        <FileText className="w-12 h-12 text-[var(--secondary)]/30 mb-4" />
                        <p className="text-lg font-[family-name:var(--font-dm-serif)] text-[var(--foreground)]">No reports generated yet</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  patients.map((p) => (
                    <tr key={p.report_id} className="hover:bg-[var(--background)]/50 transition-colors">
                      <td className="py-5 px-6 text-[var(--secondary)]">
                        <div className="flex items-center gap-2">
                           <Calendar className="w-4 h-4 text-[var(--secondary)]/70" /> {new Date(p.report_date).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-[var(--primary-gradient-start)]" />
                          <div className="text-[var(--foreground)] font-medium">{p.patient_name}</div>
                        </div>
                        <div className="flex items-center gap-2 pl-6">
                           <Activity className="w-3.5 h-3.5 text-[var(--secondary)]/50" />
                          <div className="text-[var(--secondary)] font-mono text-xs">{p.report_id}</div>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-4">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-bold shadow-sm ${getPriorityColor(p.priority_level)}`}>
                            {p.priority_level}
                          </span>
                          <span className="text-[var(--foreground)] font-mono font-semibold">Level: {p.priority_score.toFixed(1)} / 4</span>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <button 
                          onClick={() => router.push(`/doctor/report/${p.report_id}`)}
                          className="inline-flex items-center justify-center bg-[var(--primary-gradient-start)]/5 hover:bg-[var(--primary-gradient-start)]/10 text-[var(--primary-gradient-start)] border border-[var(--primary-gradient-start)]/20 py-2.5 px-4 rounded-xl transition-all font-semibold text-xs group"
                        >
                          View Report <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                        </button>
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
