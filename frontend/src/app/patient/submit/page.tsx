"use client";

import { motion } from "framer-motion";
import { Activity, Send, FileText, UserCircle, ArrowLeft, Image as ImageIcon, X, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import MicInput from "@/components/MicInput";

export default function PatientSymptomForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentEmail = searchParams.get("email") || "patient@example.com";
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    email: currentEmail,
    duration: "",
    symptoms: ""
  });
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync email and name if it changes in searchParams or localStorage
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.name) {
      setFormData(prev => ({ ...prev, name: user.name }));
    }
    if (currentEmail && currentEmail !== "patient@example.com") {
      setFormData(prev => ({ ...prev, email: currentEmail }));
    } else if (user.email) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [currentEmail]);

  const [loading, setLoading] = useState(false);
  const [translatingFields, setTranslatingFields] = useState<Record<string, boolean>>({});

  const handleTranslateBlur = async (field: 'duration' | 'symptoms') => {
    const text = formData[field];
    if (!text.trim()) return;

    // Quick skip if likely already English
    const nonAsciiRatio = (text.replace(/[\x00-\x7F]/g, '').length) / text.length;
    if (nonAsciiRatio < 0.1) return;

    setTranslatingFields(prev => ({ ...prev, [field]: true }));
    try {
      const res = await fetch("http://localhost:5000/api/ai/translate-to-english", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translated && data.translated !== text) {
          setFormData(prev => ({ ...prev, [field]: data.translated }));
        }
      }
    } catch (err) {
      console.error("Translation failed:", err);
    } finally {
      setTranslatingFields(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("age", formData.age);
      
      const fullSymptoms = formData.duration 
        ? `Duration: ${formData.duration}. Symptoms: ${formData.symptoms}` 
        : formData.symptoms;
      formDataToSend.append("symptoms", fullSymptoms);
      
      if (image) {
        formDataToSend.append("image", image);
      }

      const response = await fetch("http://localhost:5000/api/patient/submit", {
        method: "POST",
        body: formDataToSend
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/patient/reports?email=" + encodeURIComponent(formData.email));
      } else {
        alert(data.error || "Failed to submit symptoms. Please try again.");
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 relative overflow-hidden bg-[var(--background)] font-[family-name:var(--font-inter)] text-[var(--foreground)]">
      {/* Decorative gradients */}
      <div className="absolute top-10 right-[-10%] w-[400px] h-[400px] bg-[var(--primary-gradient-end)]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-[-10%] w-[300px] h-[300px] bg-[var(--primary-gradient-start)]/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-3xl mx-auto relative z-10 pt-4">
        <button 
          onClick={() => router.push("/")}
          className="absolute top-4 left-0 flex items-center text-[var(--secondary)] hover:text-[var(--primary-gradient-start)] transition-colors font-medium text-sm border hover:border-[var(--primary-gradient-start)]/30 px-3 py-1.5 rounded-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 mt-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary-gradient-start)]/10 to-[var(--primary-gradient-end)]/10 border border-[var(--primary-gradient-start)]/20 mb-6 shadow-sm">
            <Activity className="w-8 h-8 text-[var(--primary-gradient-start)]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-dm-serif)] text-[var(--foreground)] mb-4 tracking-tight">Symptom Assessment</h1>
          <p className="text-[var(--secondary)] text-lg max-w-xl mx-auto">
            Please provide your details and describe your symptoms. Our AI will analyze the severity and triage you accordingly.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Patient Details Section */}
            <div>
              <h3 className="text-[var(--foreground)] font-[family-name:var(--font-dm-serif)] text-xl mb-4 border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                 <UserCircle className="w-5 h-5 text-[var(--primary-gradient-start)]"/> Patient Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary)] mb-2">Patient Name</label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--secondary)]" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl py-3 pl-10 pr-4 text-[var(--foreground)] placeholder-[var(--secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--primary-gradient-start)]/20 focus:border-[var(--primary-gradient-start)] transition-all shadow-sm"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--secondary)] mb-2">Age</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="120"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-[var(--foreground)] placeholder-[var(--secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--primary-gradient-start)]/20 focus:border-[var(--primary-gradient-start)] transition-all shadow-sm"
                    placeholder="e.g. 45"
                  />
                </div>
              </div>
            </div>

            {/* Medical Data Section */}
            <div>
              <h3 className="text-[var(--foreground)] font-[family-name:var(--font-dm-serif)] text-xl mb-4 border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                 <Activity className="w-5 h-5 text-[var(--primary-gradient-start)]"/> Medical Information
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-[var(--secondary)]">Duration of Symptoms</label>
                    {translatingFields['duration'] && <span className="text-xs text-[var(--primary-gradient-start)] animate-pulse">Translating to English...</span>}
                  </div>
                  <div className="relative">
                    <Activity className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--secondary)]" />
                    <input
                      type="text"
                      required
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      onBlur={() => handleTranslateBlur('duration')}
                      className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl py-3 pl-10 pr-4 text-[var(--foreground)] placeholder-[var(--secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--primary-gradient-start)]/20 focus:border-[var(--primary-gradient-start)] transition-all shadow-sm"
                      placeholder="e.g. 2 days, since morning"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-[var(--secondary)]">
                      Describe Your Symptoms
                      {translatingFields['symptoms'] && <span className="ml-3 text-xs text-[var(--primary-gradient-start)] font-normal animate-pulse">Translating to English...</span>}
                    </label>
                    <MicInput 
                      onTranscript={(text) => setFormData(prev => ({ ...prev, symptoms: prev.symptoms ? prev.symptoms + " " + text : text }))} 
                    />
                  </div>
                  <div className="relative">
                    <FileText className="absolute left-3 top-4 w-5 h-5 text-[var(--secondary)]" />
                    <textarea
                      required
                      rows={5}
                      value={formData.symptoms}
                      onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                      onBlur={() => handleTranslateBlur('symptoms')}
                      className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl py-3 pl-10 pr-4 text-[var(--foreground)] placeholder-[var(--secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--primary-gradient-start)]/20 focus:border-[var(--primary-gradient-start)] transition-all resize-none shadow-sm"
                      placeholder='Example: "I have chest pain and difficulty breathing since morning..."'
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

            {/* Media Upload Section */}
            <div>
              <div className="bg-[var(--background)]/50 border border-[var(--border-color)] rounded-2xl p-6">
                <label className="block text-sm font-medium text-[var(--secondary)] mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[var(--primary-gradient-start)]" /> Upload Image (Optional)
                </label>
                
                <div className="flex flex-col gap-4">
                  {!imagePreview ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[var(--border-color)] hover:border-[var(--primary-gradient-start)]/40 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-[var(--card-bg)]"
                    >
                      <ImageIcon className="w-10 h-10 text-[var(--secondary)]/40 mb-2" />
                      <p className="text-[var(--secondary)] text-sm font-medium">Click to upload medical photo</p>
                      <p className="text-[var(--secondary)]/60 text-xs mt-1">Accepts JPG, PNG, JPEG</p>
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-[var(--border-color)] bg-white/50">
                      <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-contain" />
                      <button 
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 bg-[var(--emergency-red)] text-white p-2 rounded-full hover:bg-red-600 transition-all shadow-lg hidden peer-hover:block hover:block"
                        style={{ display: "block" }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/png, image/jpeg, image/jpg"
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-[var(--warning-yellow)]/10 border border-[var(--warning-yellow)]/20 p-4 rounded-xl flex gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--warning-yellow)] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--warning-yellow)]/80 leading-relaxed font-medium">
                <strong className="text-[var(--warning-yellow)] block mb-1">Disclaimer:</strong> AI analysis is only an assistive triage tool and not a medical diagnosis. In case of emergency, please contact professional medical services immediately.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || Object.values(translatingFields).some(v => v)}
              className="w-full group text-white font-medium text-lg flex items-center justify-center py-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-none disabled:transform-none bg-gradient-to-r from-[var(--primary-gradient-start)] to-[var(--primary-gradient-end)] hover:-translate-y-0.5"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : Object.values(translatingFields).some(v => v) ? (
                "Translating to English..."
              ) : (
                <>
                  Submit Symptoms <Send className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            
            <div className="text-center mt-6">
              <Link href={`/patient/reports?email=${encodeURIComponent(currentEmail)}`} className="text-sm font-medium text-[var(--primary-gradient-start)] hover:text-[var(--primary-gradient-end)] hover:underline transition-colors flex items-center justify-center">
                <FileText className="w-4 h-4 mr-2" /> View Past Reports
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
