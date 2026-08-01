"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FiUser, FiLock, FiArrowLeft, FiSave, FiMail, FiTrash2, FiPlus, FiShield, FiCheckCircle } from "react-icons/fi";
import { motion } from "framer-motion";
import Link from "next/link";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure, Input, Checkbox } from "@heroui/react";

const ALL_CATEGORIES = ["Semua", "Household", "Login", "Verifikasi", "Ubah Email", "Reset Password"];
const OTHER_CATEGORIES = ["Household", "Login", "Verifikasi", "Ubah Email", "Reset Password"];

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

  // Modal State
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [emailToDelete, setEmailToDelete] = useState<number | null>(null);

  // 2FA State
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState("");
  const [twoFactorPin, setTwoFactorPin] = useState("");
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [setupError, setSetupError] = useState("");

  const userId = (session?.user as any)?.id;

  useEffect(() => {
    if (session?.user) {
      setUsername((session.user as any).username || "");
      setIs2FAEnabled((session.user as any).two_factor_enabled || false);
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
        body: JSON.stringify({ 
          userId, 
          email: newEmail.trim(), 
          password: newAppPassword.trim(), 
          imap_host: newImapHost.trim(), 
          imap_port: newImapPort.trim() 
        })
      });

      const data = await res.json();
      if (res.ok) {
        setNewEmail("");
        setNewAppPassword("");
        setNewImapHost("imap.gmail.com");
        setNewImapPort("993");
        fetchEmails();
        alert("Bind successfully! Email siap digunakan.");
      } else {
        setEmailError(data.error || "Gagal menambah email");
      }
    } catch (err) {
      setEmailError("Kesalahan jaringan");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleDeleteEmail = async () => {
    if (!emailToDelete) return;
    try {
      const res = await fetch(`/api/emails/${emailToDelete}`, { method: "DELETE" });
      if (res.ok) {
        fetchEmails();
        onOpenChange(); // Close modal
      }
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

  const handleGenerate2FA = async () => {
    setSetupLoading(true);
    setSetupError("");
    try {
      const res = await fetch('http://localhost:5001/api/users/2fa/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'RahasiaSuperAman123!'
        },
        body: JSON.stringify({ userId, username: (session?.user as any)?.username })
      });
      const data = await res.json();
      if (res.ok) {
        setQrCodeData(data.qr_code);
        setIs2FAModalOpen(true);
      } else {
        setSetupError(data.error || 'Gagal memulai setup 2FA');
      }
    } catch (e) {
      setSetupError('Kesalahan jaringan');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerify2FA = async (tokenOverride?: string) => {
    const pin = typeof tokenOverride === "string" ? tokenOverride : twoFactorPin;
    setVerifyLoading(true);
    setSetupError("");
    try {
      const res = await fetch('http://localhost:5001/api/users/2fa/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'RahasiaSuperAman123!'
        },
        body: JSON.stringify({ userId, token: pin })
      });
      const data = await res.json();
      if (res.ok) {
        setIs2FAEnabled(true);
        setIs2FAModalOpen(false);
        setTwoFactorPin("");
        await update({ two_factor_enabled: true });
        alert("2FA berhasil diaktifkan!");
      } else {
        setSetupError(data.error || 'Kode tidak valid');
      }
    } catch (e) {
      setSetupError('Kesalahan jaringan');
    } finally {
      setVerifyLoading(false);
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
            <Button variant="light" className="text-neutral-400 hover:text-white transition-colors mb-6 text-sm px-0" startContent={<FiArrowLeft />}>
              Kembali ke Dashboard
            </Button>
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
              <Input
                isRequired
                type="text"
                label="Username Baru"
                placeholder="Masukkan username"
                labelPlacement="outside"
                startContent={<FiUser className="text-neutral-500 flex-shrink-0" />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                classNames={{
                  inputWrapper: "bg-neutral-900/50 border-neutral-700 hover:border-red-500/50 focus-within:border-red-500",
                  input: "text-white",
                  label: "text-neutral-300 font-medium"
                }}
              />

              <Input
                type="password"
                label="Password Baru"
                placeholder="Kosongkan jika tak diubah"
                labelPlacement="outside"
                startContent={<FiLock className="text-neutral-500 flex-shrink-0" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                classNames={{
                  inputWrapper: "bg-neutral-900/50 border-neutral-700 hover:border-red-500/50 focus-within:border-red-500",
                  input: "text-white",
                  label: "text-neutral-300 font-medium"
                }}
              />

              {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
              {message && <p className="text-green-500 text-xs font-medium">{message}</p>}

              <Button 
                type="submit" 
                isLoading={isLoading}
                className="w-full font-semibold bg-neutral-800 hover:bg-neutral-700 text-white py-6 rounded-xl transition-all mt-2"
                startContent={!isLoading && <FiSave />}
              >
                {isLoading ? "Menyimpan..." : "Simpan Profil"}
              </Button>
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
                      <Button 
                        isIconOnly
                        variant="light"
                        color="danger"
                        onPress={() => {
                          setEmailToDelete(email.id);
                          onOpen();
                        }}
                        className="text-neutral-500 hover:text-red-500 rounded-lg transition-colors"
                        title="Hapus email"
                      >
                        <FiTrash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form onSubmit={handleAddEmail} className="flex flex-col gap-4 pt-4 border-t border-white/5">
              <Input
                isRequired
                type="email"
                placeholder="Alamat Email (misal: admin@alflix.com)"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                classNames={{
                  inputWrapper: "bg-[#050505] border-neutral-800 focus-within:border-red-500/50",
                  input: "text-white text-sm"
                }}
              />
              <Input
                isRequired
                type="password"
                placeholder="Sandi Aplikasi (App Password)"
                value={newAppPassword}
                onChange={(e) => setNewAppPassword(e.target.value)}
                classNames={{
                  inputWrapper: "bg-[#050505] border-neutral-800 focus-within:border-red-500/50",
                  input: "text-white text-sm"
                }}
              />
              <div className="flex gap-3">
                <Input
                  isRequired
                  type="text"
                  placeholder="IMAP Host (contoh: mail.alflix.com)"
                  value={newImapHost}
                  onChange={(e) => setNewImapHost(e.target.value)}
                  className="w-2/3"
                  classNames={{
                    inputWrapper: "bg-[#050505] border-neutral-800 focus-within:border-red-500/50",
                    input: "text-white text-sm"
                  }}
                />
                <Input
                  isRequired
                  type="number"
                  placeholder="Port (993)"
                  value={newImapPort}
                  onChange={(e) => setNewImapPort(e.target.value)}
                  className="w-1/3"
                  classNames={{
                    inputWrapper: "bg-[#050505] border-neutral-800 focus-within:border-red-500/50",
                    input: "text-white text-sm"
                  }}
                />
              </div>
              {emailError && <p className="text-red-500 text-xs font-medium">{emailError}</p>}
              <Button 
                type="submit" 
                color="danger"
                isLoading={emailLoading}
                className="w-full font-semibold shadow-lg shadow-red-500/20 py-6 rounded-xl"
                startContent={!emailLoading && <FiPlus />}
              >
                {emailLoading ? "Menambahkan..." : "Tambah Email"}
              </Button>
            </form>
          </div>
        </div>

        {/* Card Preferensi Tampilan */}
        <div className="bg-neutral-900/60 border border-white/10 backdrop-blur-xl shadow-lg rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-2">Preferensi Tampilan</h2>
          <p className="text-xs text-neutral-400 mb-6">Pilih kategori tab OTP yang ingin diaktifkan di Dashboard. Pengaturan ini akan tersimpan khusus untuk akun ini.</p>
          
          <div className="flex flex-wrap gap-4 mt-2">
            {ALL_CATEGORIES.map(cat => (
              <Checkbox 
                key={cat}
                isSelected={preferences.includes(cat)}
                onValueChange={(checked) => handleToggleCategory(cat, checked)}
                color="danger"
                classNames={{
                  base: "px-4 py-3 m-0 bg-neutral-900/50 border border-neutral-700/50 rounded-xl hover:border-red-500/30 hover:bg-neutral-800/50 transition-all cursor-pointer w-auto min-w-[120px] justify-start",
                  label: `text-sm font-medium transition-colors ${preferences.includes(cat) ? 'text-white' : 'text-neutral-500'}`
                }}
              >
                {cat}
              </Checkbox>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/10 flex justify-end">
             <Button 
                onPress={handleUpdatePreferences}
                isLoading={prefLoading}
                color="danger"
                className="font-semibold shadow-lg shadow-red-500/20 px-6 rounded-xl"
                startContent={!prefLoading && <FiSave />}
              >
                {prefLoading ? "Menyimpan..." : "Simpan Preferensi"}
             </Button>
          </div>
        </div>

        {/* Keamanan 2FA */}
        <div className="bg-neutral-900/60 border border-white/10 backdrop-blur-xl shadow-lg rounded-2xl p-6 md:col-span-2">
          <h2 className="text-xl font-bold text-white mb-2">Keamanan (2FA)</h2>
          <p className="text-xs text-neutral-400 mb-6">Tambahkan lapisan keamanan ganda dengan aplikasi Google Authenticator atau Apple Passwords.</p>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 border border-white/10 rounded-xl bg-[#050505]">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${is2FAEnabled ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                {is2FAEnabled ? <FiCheckCircle className="text-2xl" /> : <FiShield className="text-2xl" />}
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">
                  {is2FAEnabled ? "2FA Aktif" : "2FA Belum Aktif"}
                </h3>
                <p className="text-sm text-neutral-400 max-w-md">
                  {is2FAEnabled 
                    ? "Akun Anda saat ini terlindungi dengan Autentikasi Dua Faktor. Setiap kali masuk, Anda perlu memasukkan kode."
                    : "Aktifkan 2FA untuk melindungi akun Anda dari akses tidak sah meskipun password Anda bocor."}
                </p>
                {setupError && <p className="text-red-500 text-xs mt-2">{setupError}</p>}
              </div>
            </div>

            {!is2FAEnabled ? (
              <Button 
                color="danger" 
                onPress={handleGenerate2FA}
                isLoading={setupLoading}
                className="w-full md:w-auto font-semibold px-8"
              >
                Aktifkan 2FA
              </Button>
            ) : (
              <Button 
                variant="bordered"
                color="default" 
                isDisabled
                className="w-full md:w-auto text-neutral-500 border-neutral-800"
              >
                Terkonfigurasi
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} classNames={{ base: "bg-[#18181b] border border-white/10 text-white", closeButton: "hover:bg-white/10 active:bg-white/10" }}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Hapus Email IMAP</ModalHeader>
              <ModalBody>
                <p className="text-neutral-300">
                  Apakah Anda yakin ingin menghapus email ini? OTP Netflix yang masuk ke email ini tidak akan ditangkap lagi oleh sistem.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose} className="text-neutral-300">
                  Batal
                </Button>
                <Button color="danger" onPress={handleDeleteEmail}>
                  Ya, Hapus
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 2FA Setup Modal */}
      <Modal isOpen={is2FAModalOpen} onOpenChange={setIs2FAModalOpen} isDismissable={false} hideCloseButton classNames={{ base: "bg-[#18181b] border border-white/10 text-white" }}>
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-center items-center">
                <FiShield className="text-4xl text-red-500 mb-2" />
                Konfigurasi 2FA
              </ModalHeader>
              <ModalBody className="items-center pb-6">
                <p className="text-neutral-300 text-sm text-center mb-4">
                  1. Buka aplikasi Google Authenticator atau Apple Passwords.<br/>
                  2. Scan QR Code di bawah ini.
                </p>
                {qrCodeData && (
                  <div className="bg-white p-4 rounded-xl mb-4">
                    <img src={qrCodeData} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                )}
                
                <p className="text-neutral-300 text-sm text-center mb-4">
                  3. Masukkan 6-digit PIN yang muncul di aplikasi Anda untuk memverifikasi.
                </p>
                
                <Input
                  autoFocus
                  type="text"
                  placeholder="Contoh: 123456"
                  maxLength={6}
                  value={twoFactorPin}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTwoFactorPin(val);
                    if (val.length === 6) {
                      handleVerify2FA(val);
                    }
                  }}
                  classNames={{
                    inputWrapper: "bg-[#050505] border-neutral-800 focus-within:border-red-500/50 max-w-[200px] mx-auto",
                    input: "text-white text-center tracking-[0.5em] font-mono text-lg"
                  }}
                />
                
                {setupError && <p className="text-red-500 text-xs mt-2">{setupError}</p>}
              </ModalBody>
              <ModalFooter className="flex justify-between">
                <Button color="default" variant="light" onPress={() => setIs2FAModalOpen(false)} className="text-neutral-300">
                  Batal
                </Button>
                <Button color="danger" onPress={() => handleVerify2FA()} isLoading={verifyLoading} isDisabled={twoFactorPin.length < 6}>
                  Verifikasi & Aktifkan
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
