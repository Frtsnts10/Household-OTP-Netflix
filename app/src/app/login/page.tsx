"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { FiLock, FiUser } from "react-icons/fi";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      username,
      password,
    });

    if (res?.error) {
      setError("Username atau password salah");
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
        </div>

        <div className="bg-neutral-900/60 border border-white/10 backdrop-blur-xl shadow-lg rounded-2xl">
          <div className="p-8">
            <form onSubmit={handleLogin} className="flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-300">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="text-neutral-500 group-hover:text-red-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-neutral-900/50 border border-neutral-700 text-white text-sm rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 block pl-10 p-3 transition-all outline-none hover:border-red-500/50"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-300">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="text-neutral-500 group-hover:text-red-400 transition-colors" />
                  </div>
                  <input
                    type="password"
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-900/50 border border-neutral-700 text-white text-sm rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 block pl-10 p-3 transition-all outline-none hover:border-red-500/50"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center font-medium">{error}</p>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full font-semibold shadow-lg shadow-red-500/20 mt-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? "Memproses..." : "Masuk"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
