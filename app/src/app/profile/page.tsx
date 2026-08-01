"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FiUser, FiLock, FiArrowLeft, FiSave, FiMail, FiTrash2, FiPlus } from "react-icons/fi";
import { motion } from "framer-motion";
import Link from "next/link";

const ALL_CATEGORIES = ["Semua", "Household", "Login", "Verifikasi", "Ubah Email"];
const OTHER_CATEGORIES = ["Household", "Login", "Verifikasi", "Ubah Email"];

type EmailAccount = {
  id: number;
  email: string;
  imap_host?: string;
  created_at: string;
};

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [prefLoading, setPrefLoading] = useState(false);
  const [preferences, setPreferences] = useState<string[]>(ALL_CATEGORIES);

  // Email state
  const [emails, setEmails] = useState<EmailAccount[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newAppPassword, setNewAppPassword] = useState("");
  const [newImapHost, setNewImapHost] = useState("imap.gmail.com");
  const [newImapPort, setNewImapPort] = useState("993");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const userId = (session?.user as any)?.id;

  useEffect(() => {
    if (session?.user) {
      setUsername((session.user as any).username || "");
      if ((session.user as any).preferences) {
        setPreferences((session.user as any).preferences);
      }
      if (userId) {
        fetchEmails();
      }
    }
  }, [session, userId]);

  const fetchEmails = async () => {
    try {
      const res = await fetch(`/api/emails/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch emails");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: password || undefined, preferences })
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage("Profil berhasil diperbarui. Anda akan dikeluarkan...");
        setTimeout(() => {
          signOut({ callbackUrl: "/login" });
        }, 2000);
      } else {
        setError(data.error || "Gagal memperbarui profil");
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePreferences = async () => {
    setPrefLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, preferences })
      });

      if (res.ok) {
        await update({ preferences });
        alert("Preferensi Tampilan berhasil disimpan!");
      } else {
        alert("Gagal menyimpan preferensi");
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan");
    } finally {
      setPrefLoading(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError("");

    try {
      const res = await fetch(`/api/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email: newEmail, password: newAppPassword, imap_host: newImapHost, imap_port: newImapPort })
      });

      const data = await res.json();
      if (res.ok) {
        setNewEmail("");
        setNewAppPassword("");
        setNewImapHost("imap.gmail.com");
        setNewImapPort("993");
        fetchEmails();
      } else {
        setEmailError(data.error || "Gagal menambah email");
      }
    } catch (err) {
      setEmailError("Kesalahan jaringan");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleDeleteEmail = async (id: number) => {
    if (!confirm("Hapus email ini? OTP dari email ini tidak akan dibaca lagi.")) return;
    try {
      const res = await fetch(`/api/emails/${id}`, { method: "DELETE" });
      if (res.ok) fetchEmails();
    } catch (err) {
      console.error("Failed to delete email");
    }
  };

  const handleToggleCategory = (cat: string, checked: boolean) => {
    if (cat === "Semua") {
      setPreferences(checked ? ALL_CATEGORIES : []);
    } else {
      let newPrefs: string[];
      if (checked) {
        newPrefs = [...preferences, cat];
        const allOthersChecked = OTHER_CATEGORIES.every(c => newPrefs.includes(c));
        if (allOthersChecked && !newPrefs.includes("Semua")) {
          newPrefs.push("Semua");
        }
      } else {
        newPrefs = preferences.filter(p => p !== cat && p !== "Semua");
      }
      setPreferences(newPrefs);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl flex flex-col gap-8"
      >
        <div>
          <Link href="/">
            <button className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-6 text-sm">
              <FiArrowLeft /> Kembali ke Dashboard
            </button>
          </Link>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700 mb-2">
              Pengaturan Sistem
            </h1>
            <p className="text-neutral-400">Kelola kredensial login dan email Netflix Anda</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ubah Profil */}
          <div className="bg-neutral-900/60 border border-white/10 backdrop-blur-xl shadow-lg rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Profil Login</h2>
            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-300">Username Baru</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="text-neutral-500 group-hover:text-red-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-neutral-900/50 border border-neutral-700 text-white text-sm rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 block pl-10 p-2.5 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-300">Password Baru</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="text-neutral-500 group-hover:text-red-400 transition-colors" />
                  </div>
                  <input
                    type="password"
                    placeholder="Kosongkan jika tak diubah"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-900/50 border border-neutral-700 text-white text-sm rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 block pl-10 p-2.5 transition-all outline-none"
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
              {message && <p className="text-green-500 text-xs font-medium">{message}</p>}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full font-semibold bg-neutral-800 hover:bg-neutral-700 text-white py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                <FiSave /> {isLoading ? "Menyimpan..." : "Simpan Profil"}
              </button>
            </form>
          </div>

          {/* Card Email (IMAP) */}
          <div className="bg-neutral-900/60 border border-white/10 backdrop-blur-xl shadow-lg rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-2">Akun Email (IMAP)</h2>
            <p className="text-xs text-neutral-400 mb-6">Tambahkan email yang akan dipantau secara otomatis untuk menangkap OTP Netflix.</p>
            
            <div className="mb-6">
              {emails.length === 0 ? (
                <p className="text-xs text-neutral-500 italic text-center py-4">Belum ada email yang didaftarkan.</p>
              ) : (
                <ul className="space-y-3">
                  {emails.map((email) => (
                    <li key={email.id} className="flex justify-between items-center bg-[#050505] border border-white/5 p-3 rounded-xl">
                      <div className="flex items-center gap-3 text-sm text-neutral-300 font-mono">
                        <FiMail className="text-red-500" />
                        <div>
                          <p>{email.email}</p>
                          <p className="text-[10px] text-neutral-600">{email.imap_host || 'imap.gmail.com'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteEmail(email.id)}
                        className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Hapus email"
                      >
                        <FiTrash2 />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form onSubmit={handleAddEmail} className="flex flex-col gap-3 pt-4 border-t border-white/5">
              <input 
                type="email" 
                placeholder="Alamat Email (misal: admin@alflix.com)"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-[#050505] border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/50 transition-colors"
                required
              />
              <input 
                type="password" 
                placeholder="Sandi Aplikasi (App Password)"
                value={newAppPassword}
                onChange={(e) => setNewAppPassword(e.target.value)}
                className="w-full bg-[#050505] border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/50 transition-colors"
                required
              />
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="IMAP Host (contoh: mail.alflix.com)"
                  value={newImapHost}
                  onChange={(e) => setNewImapHost(e.target.value)}
                  className="w-2/3 bg-[#050505] border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/50 transition-colors"
                  required
                />
                <input 
                  type="number" 
                  placeholder="Port (993)"
                  value={newImapPort}
                  onChange={(e) => setNewImapPort(e.target.value)}
                  className="w-1/3 bg-[#050505] border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/50 transition-colors"
                  required
                />
              </div>
              {emailError && <p className="text-red-500 text-xs font-medium">{emailError}</p>}
              <button 
                type="submit" 
                disabled={emailLoading}
                className="w-full font-semibold shadow-lg shadow-red-500/20 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FiPlus /> {emailLoading ? "Menambahkan..." : "Tambah Email"}
              </button>
            </form>
          </div>
        </div>

        {/* Card Preferensi Tampilan */}
        <div className="bg-neutral-900/60 border border-white/10 backdrop-blur-xl shadow-lg rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-2">Preferensi Tampilan</h2>
          <p className="text-xs text-neutral-400 mb-6">Pilih kategori tab OTP yang ingin diaktifkan di Dashboard. Pengaturan ini akan tersimpan khusus untuk akun ini.</p>
          
          <div className="flex flex-wrap gap-4">
            {ALL_CATEGORIES.map(cat => (
              <label key={cat} className="flex items-center gap-3 px-4 py-3 bg-neutral-900/50 border border-neutral-700/50 rounded-xl cursor-pointer hover:border-red-500/30 hover:bg-neutral-800/50 transition-all select-none group">
                <input 
                  type="checkbox"
                  checked={preferences.includes(cat)}
                  onChange={(e) => handleToggleCategory(cat, e.target.checked)}
                  className="w-4 h-4 text-red-600 bg-neutral-700 border-neutral-600 rounded focus:ring-red-600 focus:ring-2 cursor-pointer transition-all"
                />
                <span className={`text-sm font-medium transition-colors ${preferences.includes(cat) ? 'text-white' : 'text-neutral-500'}`}>{cat}</span>
              </label>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/10 flex justify-end">
             <button 
                onClick={handleUpdatePreferences}
                disabled={prefLoading}
                className="font-semibold bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 text-white px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <FiSave /> {prefLoading ? "Menyimpan..." : "Simpan Preferensi"}
              </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
