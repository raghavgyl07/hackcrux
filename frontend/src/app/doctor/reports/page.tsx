"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, FileText, ArrowLeft, Calendar } from "lucide-react";
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

export default function DoctorAllReports() {
  const router = useRouter();
  const [patients, setPatients] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      // The dashboard endpoint already gives us all reports parsed with updated priorities correctly sorted
      const res = await fetch("http://localhost:5000/api/doctor/dashboard");
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
    switch (level.toUpperCase()) {
      case "RISKY": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "HIGH": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "MEDIUM": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "LOW": return "bg-green-500/10 text-green-500 border-green-500/20";
      default: return "bg-neutral-500/10 text-neutral-400 border-neutral-500/20";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-6 md:p-10 relative">
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-indigo-600/5 blur-[150px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <Link href="/doctor/dashboard" className="inline-flex items-center text-indigo-400 hover:text-indigo-300 mb-6 transition-colors text-sm font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">All Patient Reports</h1>
            </div>
            <p className="text-neutral-400">Master view of all historical and active patient triage records</p>
          </div>
        </header>

        {/* Priority List Table */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 text-sm">
                  <th className="py-4 px-6 font-medium">Date</th>
                  <th className="py-4 px-6 font-medium">Patient Details</th>
                  <th className="py-4 px-6 font-medium">Status Level</th>
                  <th className="py-4 px-6 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-sm">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-neutral-500">
                      No reports generated yet
                    </td>
                  </tr>
                ) : (
                  patients.map((p) => (
                    <tr key={p.report_id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="py-4 px-6 text-neutral-400">
                        <div className="flex items-center gap-2">
                           <Calendar className="w-4 h-4 text-neutral-500" /> {new Date(p.report_date).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-white font-medium">{p.patient_name}</div>
                        <div className="text-neutral-500 font-mono text-xs">{p.report_id}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 bg-opacity-10 border rounded-full text-xs font-semibold ${getPriorityColor(p.priority_level)}`}>
                            {p.priority_level}
                          </span>
                          <span className="text-neutral-400 font-mono">Score: {p.priority_score.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button 
                          onClick={() => router.push(`/doctor/report/${p.report_id}`)}
                          className="inline-flex items-center justify-center text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 p-2 rounded-lg transition-colors"
                        >
                          View Report <ArrowRight className="w-4 h-4 ml-1" />
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
