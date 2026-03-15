"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, AlertTriangle, ArrowRight, Activity, Stethoscope, ArrowLeft, FileText, Zap, Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Report {
  report_id: string;
  patient_id: string;
  patient_name: string;
  priority_level: string;
  priority_score: number;
  report_date: string;
}

interface DashboardStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export default function DoctorDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
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
    fetchDashboardData(user.department);
  }, []);

  const fetchDashboardData = async (dept: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/doctor/dashboard?department=${encodeURIComponent(dept || department)}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setPatients(data.patients);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (level: string) => {
    switch (level.toUpperCase()) {
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
    <div className="min-h-screen relative bg-[var(--background)] font-[family-name:var(--font-inter)] text-[var(--foreground)] overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-10 right-[-10%] w-[500px] h-[500px] bg-[var(--primary-gradient-end)]/5 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-[var(--card-bg)] shadow-sm border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary-gradient-start)] to-[var(--primary-gradient-end)] flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-[var(--foreground)] font-[family-name:var(--font-dm-serif)] text-2xl tracking-tight">NeoClinic</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--secondary)] text-sm font-medium bg-[var(--background)]/80 px-4 py-1.5 rounded-full border border-[var(--border-color)]">
            <Stethoscope className="w-4 h-4 text-[var(--primary-gradient-start)]" />
            <span>{department} Department</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 pt-[104px] px-6 md:px-10 pb-10">
        <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
          <div>
            <Link href="/" className="inline-flex items-center text-[var(--secondary)] hover:text-[var(--primary-gradient-start)] mb-6 transition-colors text-sm font-medium border hover:border-[var(--primary-gradient-start)]/30 px-3 py-1.5 rounded-full bg-[var(--card-bg)] shadow-sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Role Selection
            </Link>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--primary-gradient-start)]/10 to-[var(--primary-gradient-end)]/10 border border-[var(--primary-gradient-start)]/20 flex items-center justify-center shadow-sm">
                <Stethoscope className="w-6 h-6 text-[var(--primary-gradient-start)]" />
              </div>
              <h1 className="text-4xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)] tracking-tight">{department} Dashboard</h1>
            </div>
            <p className="text-[var(--secondary)] pl-16">Real-time AI-powered patient prioritization for {department}</p>
          </div>
          <div className="flex gap-4 mt-2 md:mt-12">
            <Link 
              href="/doctor/reports" 
              className="bg-[var(--card-bg)] hover:bg-[var(--background)]/50 text-[var(--foreground)] border border-[var(--border-color)] px-6 py-3 rounded-xl transition-all font-medium flex items-center shadow-sm"
            >
              <FileText className="w-4 h-4 mr-2 text-[var(--secondary)]" /> All Reports
            </Link>
            <Link 
              href="/doctor/ai-assistant" 
              className="bg-[var(--primary-gradient-start)]/10 hover:bg-[var(--primary-gradient-start)]/20 text-[var(--primary-gradient-start)] border border-[var(--primary-gradient-start)]/20 px-6 py-3 rounded-xl transition-all font-semibold flex items-center shadow-sm"
            >
              <Activity className="w-4 h-4 mr-2" /> Voice Assistant
            </Link>
          </div>
        </header>

        {/* Stats Grid — 5 columns: Total | Critical | High | Medium | Low */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-5 mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-[var(--secondary)] mb-3 font-medium text-sm uppercase tracking-wider">
              <Users className="w-4 h-4 opacity-70" /> Total Patients
            </div>
            <div className="text-4xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)]">{stats?.total || 0}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[var(--emergency-red)]/5 border border-[var(--emergency-red)]/20 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-[var(--emergency-red)] mb-3 font-bold text-sm uppercase tracking-wider">
              <Zap className="w-4 h-4" /> Critical
            </div>
            <div className="text-4xl font-[family-name:var(--font-dm-serif)] text-[var(--emergency-red)]">{stats?.critical || 0}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#F97316]/5 border border-[#F97316]/20 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-[#F97316] mb-3 font-bold text-sm uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" /> High Risk
            </div>
            <div className="text-4xl font-[family-name:var(--font-dm-serif)] text-[#F97316]">{stats?.high || 0}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[var(--warning-yellow)]/5 border border-[var(--warning-yellow)]/20 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-[var(--warning-yellow)] mb-3 font-bold text-sm uppercase tracking-wider">
              <Activity className="w-4 h-4" /> Medium
            </div>
            <div className="text-4xl font-[family-name:var(--font-dm-serif)] text-[var(--warning-yellow)]">{stats?.medium || 0}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-[var(--success-green)]/5 border border-[var(--success-green)]/20 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-[var(--success-green)] mb-3 font-bold text-sm uppercase tracking-wider">
              <Heart className="w-4 h-4" /> Low Risk
            </div>
            <div className="text-4xl font-[family-name:var(--font-dm-serif)] text-[var(--success-green)]">{stats?.low || 0}</div>
          </motion.div>
        </div>

        {/* Priority List Table */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[var(--border-color)] bg-[var(--background)]/50">
            <h3 className="text-xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)] flex items-center">
              <Users className="w-5 h-5 mr-2 text-[var(--primary-gradient-start)]" /> Patient Queue
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--background)]/30 border-b border-[var(--border-color)] text-[var(--secondary)] text-sm">
                  <th className="py-4 px-6 font-semibold">Report ID</th>
                  <th className="py-4 px-6 font-semibold">Patient Name</th>
                  <th className="py-4 px-6 font-semibold">Priority Level</th>
                  <th className="py-4 px-6 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-sm">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-[var(--secondary)]">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="w-12 h-12 text-[var(--secondary)]/30 mb-4" />
                        <p className="text-lg font-[family-name:var(--font-dm-serif)] text-[var(--foreground)]">No patients in queue</p>
                        <p className="text-sm mt-1">There are no reports submitted for this department yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  patients.map((p) => (
                    <tr key={p.report_id} className="hover:bg-[var(--background)]/50 transition-colors">
                      <td className="py-5 px-6 text-[var(--foreground)] font-mono text-xs">{p.report_id}</td>
                      <td className="py-5 px-6 text-[var(--foreground)] font-medium">{p.patient_name}</td>
                      <td className="py-5 px-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold shadow-sm ${getPriorityColor(p.priority_level)}`}>
                          {p.priority_level}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <button 
                          onClick={() => router.push(`/doctor/report/${p.report_id}`)}
                          className="inline-flex items-center justify-center bg-gradient-to-r hover:from-[var(--primary-gradient-start)] hover:to-[var(--primary-gradient-end)] text-[var(--primary-gradient-start)] hover:text-white border border-[var(--primary-gradient-start)]/20 hover:border-transparent py-2 px-4 rounded-xl transition-all font-semibold text-xs group shadow-sm hover:shadow-md hover:-translate-y-0.5"
                        >
                          Review <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
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
