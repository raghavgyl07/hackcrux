"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Stethoscope, User, Mail, ShieldCheck, Activity, Languages, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function UnifiedLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showSignup, setShowSignup] = useState(false);
  
  // Signup & Department State
  const [name, setName] = useState("");
  const [role, setRole] = useState("Patient");
  const [department, setDepartment] = useState("General Medicine");
  const [isDoctorFlow, setIsDoctorFlow] = useState(false);

  const isHospitalEmail = email.toLowerCase().endsWith("@hospital.com");
  const isGmailEmail = email.toLowerCase().endsWith("@gmail.com");

  // Auto-sync role based on domain when signup shows
  useEffect(() => {
    if (showSignup) {
      if (isHospitalEmail) setRole("Doctor");
      else if (isGmailEmail) setRole("Patient");
    }
  }, [showSignup, isHospitalEmail, isGmailEmail]);

  const departments = [
    "Cardiology", "Neurology", "Orthopedics", "Dermatology", 
    "General Medicine", "Pediatrics", "ENT"
  ];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      // 1. Try Doctor specialized login first if it looks like a hospital email
      // or if the user intends to log in as a doctor
      const doctorRes = await fetch("http://localhost:5000/api/doctor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const doctorData = await doctorRes.json();

      if (doctorRes.ok && doctorData.exists) {
        // Known doctor
        setMessage("Welcome back, Doctor!");
        const userData = { ...doctorData.doctor, role: 'Doctor' };
        localStorage.setItem("user", JSON.stringify(userData));
        setTimeout(() => router.push("/doctor/dashboard"), 1500);
        return;
      }

      // 2. If not a known doctor, check if it's a known general user (Patient)
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.status === 404 && data.isNewUser) {
        setMessage(data.message);
        setShowSignup(true);
      } else if (res.ok) {
        // Welcome back logic for general users
        setMessage("Welcome back!");
        localStorage.setItem("user", JSON.stringify(data.user));
        
        setTimeout(() => {
          if (data.user.role === "Doctor") {
            router.push("/doctor/dashboard");
          } else {
            router.push(`/patient/submit?email=${encodeURIComponent(email)}`);
          }
        }, 1500);
      } else {
        setError(data.error || "An error occurred");
      }
    } catch (err) {
      setError("Connection failed. Please check your backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    setLoading(true);
    try {
      // 1. If Doctor, use the specialized register endpoint
      if (role === "Doctor") {
        const docRes = await fetch("http://localhost:5000/api/doctor/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, department }),
        });
        const docData = await docRes.json();
        
        if (!docRes.ok) throw new Error(docData.error || "Doctor registration failed");

        // Also create a general user record for name/role consistency
        await fetch("http://localhost:5000/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, role: "Doctor" }),
        });

        setMessage("Doctor account created! Redirecting...");
        localStorage.setItem("user", JSON.stringify({ ...docData.doctor, name, role: "Doctor" }));
        setTimeout(() => router.push("/doctor/dashboard"), 1500);
        return;
      }

      // 2. Standard signup for patients
      const res = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Account created! Redirecting...");
        localStorage.setItem("user", JSON.stringify(data.user));
        
        setTimeout(() => {
          router.push(`/patient/submit?email=${encodeURIComponent(email)}`);
        }, 1500);
      } else {
        setError(data.error || "Signup failed");
      }
    } catch (err: any) {
      setError(err.message || "Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[var(--background)] font-[family-name:var(--font-inter)] text-[var(--foreground)]">
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-[var(--primary-gradient-end)]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[350px] h-[350px] bg-[var(--primary-gradient-start)]/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-lg z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-md bg-gradient-to-br from-[var(--primary-gradient-start)] to-[var(--primary-gradient-end)]">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-gradient-start)]/10 border border-[var(--primary-gradient-start)]/20 text-[var(--primary-gradient-start)] text-xs font-semibold mb-4 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Secure Access
          </div>
          <h1 className="text-4xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)] mb-2">NeoClinic Portal</h1>
          <p className="text-[var(--secondary)]">Intelligent patient intake and clinical sorting</p>
        </div>

        <motion.div
          layout
          className="bg-[var(--card-bg)] border border-[var(--border-color)] p-8 md:p-10 rounded-2xl w-full relative shadow-lg overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[var(--primary-gradient-start)] to-[var(--primary-gradient-end)]" />
          
          <AnimatePresence mode="wait">
            {!showSignup ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 font-[family-name:var(--font-dm-serif)]">Login</h2>
                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-[var(--secondary)]">Email Address</label>
                    <div className="relative">
                      <Mail className="w-5 h-5 text-[var(--secondary)] absolute left-4 top-1/2 transform -translate-y-1/2" />
                      <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white border border-[var(--border-color)] rounded-xl py-4 pl-12 pr-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-gradient-start)]/20 focus:border-[var(--primary-gradient-start)] transition-all font-medium placeholder-[var(--secondary)]/60"
                        placeholder="doctor@hospital.com or patient@email.com"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[var(--emergency-red)] text-sm bg-[var(--emergency-red)]/5 p-4 rounded-xl border border-[var(--emergency-red)]/15">
                      {error}
                    </motion.div>
                  )}

                  {message && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[var(--primary-gradient-start)] text-sm bg-[var(--primary-gradient-start)]/5 p-4 rounded-xl border border-[var(--primary-gradient-start)]/15">
                      {message}
                    </motion.div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[var(--primary-gradient-start)] to-[var(--primary-gradient-end)] text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Continue <ArrowRight className="w-5 h-5 ml-2" /></>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2 font-[family-name:var(--font-dm-serif)]">Create Account</h2>
                <p className="text-[var(--secondary)] mb-8">{message || "Enter your details to get started"}</p>
                
                <form onSubmit={handleSignup} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-[var(--secondary)]">Full Name</label>
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white border border-[var(--border-color)] rounded-xl py-4 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-gradient-start)]/20 focus:border-[var(--primary-gradient-start)] transition-all font-medium placeholder-[var(--secondary)]/60"
                      placeholder="Enter your name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-3 text-[var(--secondary)]">Email Address</label>
                    <input 
                      type="email"
                      value={email}
                      readOnly
                      className="w-full bg-[var(--background)]/50 border border-[var(--border-color)] rounded-xl py-4 px-4 text-[var(--secondary)] cursor-not-allowed font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-3 text-[var(--secondary)]">Join as</label>
                    <div className="grid grid-cols-2 gap-4">
                      {["Patient", "Doctor"].map((r) => (
                        <button
                          key={r}
                          type="button"
                          disabled={(r === "Patient" && isHospitalEmail) || (r === "Doctor" && isGmailEmail)}
                          onClick={() => setRole(r)}
                          className={`py-4 rounded-xl border transition-all font-semibold flex items-center justify-center gap-2 ${
                            role === r 
                              ? "bg-[var(--primary-gradient-start)]/10 border-[var(--primary-gradient-start)]/30 text-[var(--primary-gradient-start)]" 
                              : "bg-white border-[var(--border-color)] text-[var(--secondary)] hover:border-[var(--secondary)]/50 disabled:opacity-30 disabled:cursor-not-allowed"
                          }`}
                        >
                          <User className={`w-5 h-5 ${role === r ? "text-[var(--primary-gradient-start)]" : "text-[var(--secondary)]/50"}`} />
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {role === "Doctor" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-3"
                    >
                      <label className="block text-sm font-semibold text-[var(--secondary)]">Select Department</label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full bg-white border border-[var(--border-color)] rounded-xl py-4 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-gradient-start)]/20 focus:border-[var(--primary-gradient-start)] transition-all font-medium appearance-none cursor-pointer"
                      >
                        {departments.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </motion.div>
                  )}

                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[var(--emergency-red)] text-sm bg-[var(--emergency-red)]/5 p-4 rounded-xl border border-[var(--emergency-red)]/15">
                      {error}
                    </motion.div>
                  )}

                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => { setShowSignup(false); setMessage(""); setError(""); }}
                      className="flex-1 bg-[var(--background)] hover:bg-[var(--border-color)] text-[var(--secondary)] font-bold py-4 rounded-xl transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] bg-gradient-to-r from-[var(--primary-gradient-start)] to-[var(--primary-gradient-end)] text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {loading ? (
                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : "Register"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
