"use client";

import { motion } from "framer-motion";
import { User, Stethoscope, Heart, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  const handleRoleSelection = (role: "Patient" | "Doctor") => {
    if (role === "Patient") {
      router.push("/patient/login");
    } else {
      router.push("/doctor/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden font-[family-name:var(--font-inter)] text-[var(--foreground)]" style={{ background: "var(--background)" }}>
      
      {/* Decorative gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--primary-gradient-start)]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[var(--primary-gradient-end)]/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center z-10 mb-10 mt-8 flex flex-col items-center"
      >
        <div className="w-16 h-16 rounded-[1.2rem] bg-gradient-to-br from-[var(--primary-gradient-start)] to-[var(--primary-gradient-end)] flex items-center justify-center mb-6 shadow-xl shadow-[var(--primary-gradient-start)]/20">
          <Heart className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-6xl md:text-[5.5rem] font-bold tracking-[-0.04em] mb-6 font-[family-name:var(--font-dm-serif)]">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-gradient-start)] to-[var(--primary-gradient-end)]">NeoClinic</span>
        </h1>
        
        <p className="text-[var(--secondary)] text-[1.1rem] md:text-xl max-w-2xl mx-auto font-medium leading-relaxed mb-8">
          Intelligent, AI-powered patient prioritization and clinical sorting for modern healthcare.
        </p>

        <button 
          onClick={() => handleRoleSelection("Patient")}
          className="px-8 py-3.5 rounded-xl bg-[var(--foreground)] text-white font-semibold flex items-center gap-2 shadow-lg shadow-black/10 hover:opacity-90 hover:-translate-y-0.5 transition-all text-[15px]"
        >
          Get Started <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl z-10 mt-6 md:mt-12">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1"
        >
          <button
            onClick={() => handleRoleSelection("Patient")}
            className="w-full text-left group bg-white border border-[var(--border-color)] p-8 md:p-10 rounded-2xl hover:border-[var(--primary-gradient-start)]/30 hover:shadow-xl hover:shadow-[var(--primary-gradient-start)]/5 transition-all duration-300 relative overflow-hidden h-full shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]"
          >
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-[var(--primary-gradient-start)]/5 flex items-center justify-center mb-6 text-[var(--primary-gradient-start)]">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 font-[family-name:var(--font-dm-serif)]">For Patients</h2>
              <p className="text-[var(--secondary)] text-[15px] leading-relaxed">
                Submit symptoms securely and track your clinical triage level in real-time.
              </p>
            </div>
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1"
        >
          <button
            onClick={() => handleRoleSelection("Doctor")}
            className="w-full text-left group bg-white border border-[var(--border-color)] p-8 md:p-10 rounded-2xl hover:border-[var(--primary-gradient-end)]/30 hover:shadow-xl hover:shadow-[var(--primary-gradient-end)]/5 transition-all duration-300 relative overflow-hidden h-full shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]"
          >
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-[var(--primary-gradient-end)]/5 flex items-center justify-center mb-6 text-[var(--primary-gradient-end)]">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 font-[family-name:var(--font-dm-serif)]">For Doctors</h2>
              <p className="text-[var(--secondary)] text-[15px] leading-relaxed">
                Access AI-summarized patient reports, sorted by medical urgency and priority.
              </p>
            </div>
          </button>
        </motion.div>
      </div>

    </div>
  );
}
