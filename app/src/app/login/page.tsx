"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { FiLock, FiUser, FiShield } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { Input, Button } from "@heroui/react";
import Link from "next/link";

function LoginContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get("registered") === "true";

  const handleLogin = async (e?: React.FormEvent, token?: string) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError("");

    const payload: any = {
      redirect: false,
      username,
      password,
    };

    if (show2FA) {
      payload.twoFactorToken = token || twoFactorToken;
    }

    const res = await signIn("credentials", payload);

    if (res?.error) {
      if (res.error === "2FA_REQUIRED") {
        setShow2FA(true);
        setError(""); // Clear error for step 2
      } else if (res.error === "INVALID_2FA_CODE") {
        setError("Kode 2FA tidak valid");
      } else {
        setError("Username atau password salah");
      }
      setIsLoading(false);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700 mb-2">
            Netflix OTP Center
          </h1>
          <p className="text-neutral-400">Silakan masuk untuk melanjutkan</p>
          {isRegistered && !show2FA && (
            <p className="mt-2 text-green-500 text-sm font-medium">Pendaftaran berhasil! Silakan masuk.</p>
          )}
        </div>

        <div className="bg-neutral-900/60 border border-white/10 backdrop-blur-xl shadow-lg rounded-2xl overflow-hidden relative">
          <div className="p-8">
            <form onSubmit={handleLogin} className="flex flex-col gap-6">
              
              <AnimatePresence mode="wait">
                {!show2FA ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col gap-6"
                  >
                    <Input
                      autoFocus
                      isRequired
                      type="text"
                      label="Username"
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
                      isRequired
                      type="password"
                      label="Password"
                      placeholder="Masukkan password"
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
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col gap-6"
                  >
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center mb-2">
                      <FiShield className="text-4xl text-red-500 mx-auto mb-2" />
                      <p className="text-sm text-red-200">Akun Anda dilindungi oleh 2FA. Masukkan 6-digit kode dari aplikasi Authenticator.</p>
                    </div>

                    <Input
                      autoFocus
                      isRequired
                      type="text"
                      label="Kode 2FA"
                      placeholder="Contoh: 123456"
                      labelPlacement="outside"
                      maxLength={6}
                      startContent={<FiShield className="text-neutral-500 flex-shrink-0" />}
                      value={twoFactorToken}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTwoFactorToken(val);
                        if (val.length === 6) {
                          handleLogin(undefined, val);
                        }
                      }}
                      classNames={{
                        inputWrapper: "bg-neutral-900/50 border-neutral-700 hover:border-red-500/50 focus-within:border-red-500",
                        input: "text-white text-center tracking-[0.5em] font-mono",
                        label: "text-neutral-300 font-medium"
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <p className="text-red-500 text-sm text-center font-medium">{error}</p>
              )}

              <Button 
                type="submit" 
                color="danger"
                isLoading={isLoading}
                className="w-full font-semibold shadow-lg shadow-red-500/20 mt-2 py-6 rounded-xl"
              >
                {isLoading ? "Memproses..." : show2FA ? "Verifikasi" : "Masuk"}
              </Button>

              {!show2FA && (
                <div className="text-center mt-4">
                  <Link href="/register" className="text-sm text-neutral-400 hover:text-white transition-colors">
                    Belum punya akun? <span className="text-red-500 hover:underline">Daftar di sini</span>
                  </Link>
                </div>
              )}
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <LoginContent />
    </Suspense>
  );
}
