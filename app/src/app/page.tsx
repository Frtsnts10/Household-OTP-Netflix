"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { FiMail, FiClock, FiLogOut, FiUser, FiCopy, FiCheck } from "react-icons/fi";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

type OtpData = {
  id: number;
  category: string;
  otp_code: string;
  received_at: string;
  is_read: boolean;
  receiver_email: string;
};

const CATEGORIES = ["Semua", "Household", "Login", "Verifikasi", "Ubah Email"];

export default function Home() {
  const [otps, setOtps] = useState<OtpData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Semua");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const { data: session } = useSession();

  const userId = (session?.user as any)?.id;
  const userPreferences = (session?.user as any)?.preferences;
  const visibleCategories = Array.isArray(userPreferences) && userPreferences.length > 0 ? userPreferences : CATEGORIES;

  useEffect(() => {
    if (visibleCategories.length > 0 && !visibleCategories.includes(activeTab)) {
      setActiveTab(visibleCategories[0]);
    }
  }, [visibleCategories, activeTab]);

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchOtps = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const url = activeTab === "Semua" 
        ? `/api/proxy-otps?userId=${userId}` 
        : `/api/proxy-otps/${encodeURIComponent(activeTab)}?userId=${userId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.data) {
        setOtps(data.data);
      }
    } catch (error) {
      console.error("Error fetching OTPs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, userId]);

  useEffect(() => {
    fetchOtps();
    const interval = setInterval(fetchOtps, 10000);
    return () => clearInterval(interval);
  }, [fetchOtps]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Household": return "primary";
      case "Login": return "success";
      case "Verifikasi": return "warning";
      case "Ubah Email": return "danger";
      default: return "default";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 flex flex-col items-center selection:bg-red-500/30">
      <div className="w-full max-w-[1400px]">
        {/* Header Section */}
        <div className="flex justify-end gap-3 w-full mb-8 relative z-50">
          <Link href="/profile">
            <button className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2 rounded-full transition-colors font-medium text-sm">
              <FiUser /> Profil
            </button>
          </Link>
          <button 
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-full transition-colors font-medium text-sm"
          >
            <FiLogOut /> Keluar
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-10"
        >
          <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700 mb-3 tracking-tight text-center">
            Netflix OTP Center
          </h1>
          <p className="text-neutral-400 text-center max-w-md">
            Pusat manajemen kode akses dan link verifikasi yang tersinkronisasi secara real-time.
          </p>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-10 w-full px-2">
          <div className="flex flex-wrap justify-center bg-neutral-900/80 backdrop-blur-xl border border-white/10 p-1.5 shadow-2xl rounded-2xl md:rounded-full gap-1 w-full md:w-auto">
            {visibleCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`whitespace-nowrap px-3 sm:px-4 md:px-6 h-10 md:h-12 text-xs sm:text-sm md:text-base flex-grow md:flex-grow-0 rounded-full font-semibold tracking-wide transition-all duration-300 ${
                  activeTab === cat
                    ? "bg-gradient-to-r from-red-600 to-red-700 shadow-red-500/20 text-white shadow-lg"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
          {isLoading ? (
            // Elegant Skeleton Loader
            [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-neutral-900/40 border border-white/5 backdrop-blur-md rounded-2xl p-6 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div className="w-24 h-7 rounded-full bg-neutral-800 animate-pulse" />
                  <div className="w-20 h-4 rounded-lg bg-neutral-800 animate-pulse" />
                </div>
                <div className="w-full h-16 rounded-2xl bg-neutral-800 animate-pulse" />
              </div>
            ))
          ) : otps.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full flex flex-col items-center justify-center py-32 text-neutral-500"
            >
              <div className="bg-neutral-900/50 p-6 rounded-full border border-white/5 mb-6">
                <FiMail className="w-12 h-12 opacity-50" />
              </div>
              <p className="text-xl font-medium text-neutral-400">Belum ada OTP yang diterima</p>
              <p className="text-sm text-neutral-600 mt-2">Sistem akan memperbarui secara otomatis saat ada email masuk.</p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {otps.map((otp) => {
                const isExpired = new Date().getTime() - new Date(otp.received_at + "Z").getTime() > 15 * 60 * 1000;
                
                return (
                <motion.div
                  key={otp.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                  transition={{ 
                    duration: 0.4, 
                    type: "spring", 
                    bounce: 0.3 
                  }}
                  className="w-full max-w-sm mx-auto sm:max-w-none"
                >
                  <div 
                    className={`bg-neutral-900/60 border border-white/5 transition-all duration-300 backdrop-blur-xl rounded-2xl p-6 relative overflow-hidden ${isExpired ? 'opacity-60 grayscale hover:opacity-100' : 'hover:border-red-500/30 group hover:shadow-[0_8px_30px_rgb(220,38,38,0.12)] shadow-md'}`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className={`px-3 py-1.5 text-xs font-semibold tracking-wide rounded-full border border-white/5 bg-neutral-800/50 flex items-center gap-2 ${
                        isExpired ? 'text-neutral-500' :
                        otp.category === 'Household' ? 'text-blue-400' :
                        otp.category === 'Login' ? 'text-green-400' :
                        otp.category === 'Verifikasi' ? 'text-yellow-400' :
                        otp.category === 'Ubah Email' ? 'text-red-400' : 'text-neutral-300'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${isExpired ? 'bg-neutral-600' : 'animate-pulse bg-current'}`} />
                        {otp.category}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 text-neutral-500 text-xs font-medium">
                        {isExpired ? (
                          <span className="text-neutral-500 font-bold text-[10px] uppercase border border-neutral-700 px-1.5 py-0.5 rounded">Kedaluwarsa</span>
                        ) : (
                          <span className="text-green-500/80 font-bold text-[10px] uppercase border border-green-500/30 px-1.5 py-0.5 rounded bg-green-500/10">Aktif</span>
                        )}
                        <div className="flex items-center text-[11px]">
                          <FiClock className="mr-1.5 opacity-70" />
                          {formatDistanceToNow(new Date(otp.received_at + "Z"), { addSuffix: true, locale: localeId })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center bg-[#050505] p-5 rounded-2xl border border-white/5 group-hover:border-red-500/20 transition-colors min-h-[96px] overflow-hidden relative">
                      {otp.otp_code.startsWith("http") ? (
                        <a 
                          href={otp.otp_code} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-6 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-sm font-medium rounded-xl transition-all truncate max-w-full text-center"
                          title={otp.otp_code}
                        >
                          Buka Link Verifikasi
                        </a>
                      ) : (
                        <>
                          <span className={`font-mono font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-neutral-400 text-center transition-all ${copiedId === otp.id ? 'scale-95 opacity-80' : ''} ${otp.otp_code.length > 8 ? 'text-lg md:text-xl tracking-wide break-all' : 'text-3xl tracking-[0.2em]'}`}>
                            {otp.otp_code}
                          </span>
                          <button
                            onClick={() => handleCopy(otp.id, otp.otp_code)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-neutral-800/90 hover:bg-neutral-700 backdrop-blur-md border border-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 text-neutral-300 shadow-xl"
                            title="Salin Kode"
                          >
                            {copiedId === otp.id ? <FiCheck className="text-green-500 w-4 h-4" /> : <FiCopy className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-xs text-neutral-600 font-mono select-all truncate px-2">{otp.receiver_email}</p>
                    </div>
                  </div>
                </motion.div>
              )})}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
